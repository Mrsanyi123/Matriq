'use client';

import type { AttemptResult, PracticeSessionResult, PracticeSet } from '@matriq/validation';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { ErrorState } from '../states';
import { Button } from '../ui/button';
import { ProgressBar, SampleNotice, Tag } from '../ui/primitives';
import { AnswerOption, optionState } from './answer-option';
import { HintPanel } from './hint-panel';
import { ResultsView } from './results-view';

interface QuestionState {
  selected: string | null;
  result: AttemptResult | null;
  hints: number;
}

const freshQuestion: QuestionState = { selected: null, result: null, hints: 0 };

/**
 * Runs one chapter practice session: answer → check → feedback → next, then
 * completes the session and shows results. The server (or demo) checks
 * answers; the practice set never contains the correct option.
 */
export function PracticeRunner({ set, onRestart }: { set: PracticeSet; onRestart: () => void }) {
  const { t } = useI18n();
  const { api, invalidateLearnerData } = useMatriq();
  const [index, setIndex] = useState(0);
  const [q, setQ] = useState<QuestionState>(freshQuestion);
  const [xpGained, setXpGained] = useState(0);
  const [finished, setFinished] = useState<PracticeSessionResult | null>(null);
  const shownAt = useRef(Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const question = set.questions[index];
  const total = set.questions.length;
  const isLast = index === total - 1;

  const submit = useMutation({
    mutationFn: (optionId: string) =>
      api.submitAttempt({
        sessionId: set.sessionId,
        questionId: question!.id,
        optionId,
        timeSpentMs: Math.min(3_600_000, Math.max(0, Date.now() - shownAt.current)),
      }),
    onSuccess: (result) => {
      setQ((s) => ({ ...s, result }));
      setXpGained((x) => x + result.xpAwarded);
      void invalidateLearnerData({ refetch: false });
      requestAnimationFrame(() => feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    },
  });

  const complete = useMutation({
    mutationFn: () => api.completePracticeSession(set.sessionId),
    onSuccess: (result) => {
      setXpGained((x) => x + result.xpAwarded);
      setFinished(result);
      void invalidateLearnerData();
    },
  });

  useEffect(() => {
    shownAt.current = Date.now();
    if (index > 0) headingRef.current?.focus();
  }, [index]);

  useEffect(() => {
    if (finished) {
      window.scrollTo({ top: 0 });
      resultsRef.current?.querySelector<HTMLElement>('#results-title')?.focus();
    }
  }, [finished]);

  if (finished) {
    return (
      <div ref={resultsRef}>
        <ResultsView
          result={finished}
          xpGained={xpGained}
          chapterSlug={set.chapter.slug}
          isDemo={set.questions.some((x) => x.isDemo)}
          onRetry={onRestart}
        />
      </div>
    );
  }

  if (!question) {
    return <p className="mt-8 text-center text-muted">{t('noQuestions')}</p>;
  }

  const checked = q.result !== null;
  const progress = index + (checked ? 1 : 0);

  function next() {
    if (isLast) {
      complete.mutate();
    } else {
      setIndex((i) => i + 1);
      setQ(freshQuestion);
      submit.reset();
    }
  }

  return (
    <section aria-labelledby="question-title">
      <ProgressBar className="mt-5 mb-[25px]" value={progress} max={total} label={t('practice')} />
      <div className="flex items-center justify-between gap-2.5 text-caption text-muted">
        <strong className="font-bold">
          {t('question')} {index + 1} / {total}
        </strong>
        {question.isDemo ? <Tag>{t('demo')}</Tag> : null}
      </div>
      <h1
        id="question-title"
        ref={headingRef}
        tabIndex={-1}
        lang="en"
        className="mt-5 mb-[25px] text-question focus:outline-none"
      >
        {question.prompt}
      </h1>

      <div role="group" aria-labelledby="question-title" className="flex flex-col gap-3">
        {question.options.map((option) => (
          <AnswerOption
            key={option.id}
            label={option.label}
            body={option.body}
            state={optionState(option.id, q.selected, q.result)}
            chosen={q.selected === option.id}
            checked={checked}
            onSelect={() => !checked && setQ((s) => ({ ...s, selected: option.id }))}
          />
        ))}
      </div>

      <HintPanel hints={question.hints} shown={q.hints} onMore={() => setQ((s) => ({ ...s, hints: Math.min(s.hints + 1, question.hints.length) }))} />

      {q.result ? (
        <div
          ref={feedbackRef}
          role="status"
          data-testid="feedback"
          className={
            q.result.isCorrect
              ? 'my-[18px] rounded-lg border border-success-border bg-success-bg p-[18px]'
              : 'my-[18px] rounded-lg border border-retry-border bg-retry-bg p-[18px]'
          }
        >
          <strong className="text-base">{q.result.isCorrect ? t('correct') : t('wrong')}</strong>
          <p lang="en" className={`mt-[7px] text-sm leading-[1.75] ${q.result.isCorrect ? 'text-success-ink' : 'text-retry-ink'}`}>
            {q.result.explanation}
          </p>
        </div>
      ) : null}

      {submit.isError || complete.isError ? (
        <ErrorState
          className="my-4"
          error={submit.error ?? complete.error}
          onRetry={() => (complete.isError ? complete.mutate() : q.selected && submit.mutate(q.selected))}
        />
      ) : null}

      <div className="mt-[22px]">
        {checked ? (
          <Button onClick={next} disabled={complete.isPending}>
            {isLast ? t('finish') : t('nextQuestion')}
            <ArrowRight className="size-[17px]" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={() => q.selected && submit.mutate(q.selected)}
            disabled={q.selected === null || submit.isPending}
          >
            {t('check')}
            <ArrowRight className="size-[17px]" aria-hidden="true" />
          </Button>
        )}
      </div>
      {question.isDemo ? <SampleNotice>{t('sampleShort')}</SampleNotice> : null}
    </section>
  );
}

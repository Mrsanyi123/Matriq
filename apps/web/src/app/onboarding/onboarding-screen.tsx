'use client';

import { matriqQueries, type MatriqApi } from '@matriq/api-client';
import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { DAILY_GOAL_MINUTES } from '@matriq/types';
import type { OnboardingOptions, Preferences, Profile } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Brand } from '@/components/brand';
import { LanguageButton } from '@/components/language';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ProgressBar, Skeleton, Tag } from '@/components/ui/primitives';
import { SheetOption } from '@/components/ui/sheet';
import { useApiContext } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  browserTimeZone,
  needsStream,
  onboardingSteps,
  stepError,
  toOnboardingInput,
  visibleSubjects,
  type OnboardingDraft,
  type OnboardingStep,
} from '@/lib/onboarding';
import type { AppMessageKey } from '@/lib/translate';
import { cn } from '@/lib/utils';
import { learnerDataKeys } from '@matriq/api-client';
import { useQueryClient } from '@tanstack/react-query';

const STEP_TITLES: Record<OnboardingStep, AppMessageKey> = {
  grade: 'onboarding.gradeTitle',
  stream: 'onboarding.streamTitle',
  subjects: 'onboarding.subjectsTitle',
  exam: 'onboarding.examTitle',
  language: 'onboarding.languageTitle',
  goal: 'onboarding.goalTitle',
  name: 'onboarding.nameTitle',
};

export function OnboardingScreen() {
  const { api, mode } = useApiContext();
  const router = useRouter();
  useEffect(() => {
    if (!mode) router.replace('/welcome');
  }, [mode, router]);

  return (
    <div className="min-h-dvh bg-canvas md:grid md:place-items-center md:p-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-bg px-[22px] pt-[max(12px,env(safe-area-inset-top))] pb-8 md:min-h-0 md:rounded-frame md:border-8 md:border-paper md:px-10 md:pt-6 md:pb-10 md:shadow-floating">
        <header className="flex h-topbar items-center justify-between">
          <Brand />
          <LanguageButton persist={false} />
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {api ? <OnboardingLoader api={api} /> : null}
        </main>
      </div>
    </div>
  );
}

function OnboardingLoader({ api }: { api: MatriqApi }) {
  const router = useRouter();
  const queries = useMemo(() => matriqQueries(api), [api]);
  const options = useQuery(queries.onboardingOptions());
  const profile = useQuery(queries.profile());
  const preferences = useQuery(queries.preferences());

  const onboarded = profile.data?.onboarded === true;
  useEffect(() => {
    if (onboarded) router.replace('/home');
  }, [onboarded, router]);

  const error = options.error ?? profile.error ?? preferences.error;
  if (error) {
    return (
      <ErrorState
        className="mt-8"
        error={error}
        onRetry={() => {
          void options.refetch();
          void profile.refetch();
          void preferences.refetch();
        }}
      />
    );
  }
  if (!options.data || !profile.data || !preferences.data || onboarded) {
    return (
      <div aria-busy="true" className="mt-6 space-y-4">
        <Skeleton className="h-[7px] w-full" />
        <Skeleton className="h-9 w-3/4" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[62px]" />
          ))}
        </div>
      </div>
    );
  }
  return <OnboardingFlow api={api} options={options.data} profile={profile.data} preferences={preferences.data} />;
}

export function OnboardingFlow({
  api,
  options,
  profile,
  preferences,
}: {
  api: MatriqApi;
  options: OnboardingOptions;
  profile: Profile;
  preferences: Preferences;
}) {
  const { t, tOr, language, setLanguage } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    gradeLevel: profile.gradeLevel,
    stream: profile.stream,
    subjectSlugs: preferences.subjectSlugs.length > 0 ? preferences.subjectSlugs : ['mathematics'],
    targetExam: preferences.targetExam,
    interfaceLanguage: language,
    dailyGoalMinutes: preferences.dailyGoalMinutes,
    displayName: profile.displayName ?? '',
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<AppMessageKey | null>(null);
  const [saving, setSaving] = useState(false);

  const steps = onboardingSteps(draft.gradeLevel);
  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const isLast = stepIndex >= steps.length - 1;
  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  async function finish(finalDraft: OnboardingDraft) {
    const parsed = toOnboardingInput(finalDraft, options.subjects, browserTimeZone());
    if (!parsed.success) {
      setError('onboarding.failed');
      return;
    }
    setSaving(true);
    try {
      await api.completeOnboarding(parsed.data);
      await Promise.all(learnerDataKeys(api.mode).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      router.replace('/home');
    } catch {
      setError('onboarding.failed');
      setSaving(false);
    }
  }

  function next() {
    const problem = stepError(step, draft, options.subjects);
    if (problem) {
      setError(problem);
      return;
    }
    if (isLast) void finish(draft);
    else setStepIndex((i) => i + 1);
  }

  const subjects = visibleSubjects(options.subjects, draft);

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      <p className="mt-2 text-eyebrow text-green uppercase">{t('onboarding.title')}</p>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar className="flex-1" value={stepIndex + 1} max={steps.length} label={t('onboarding.title')} />
        <span className="text-caption text-muted">{t('onboarding.step', { step: stepIndex + 1, total: steps.length })}</span>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="mt-7 mb-5 text-title focus:outline-none">
        {t(STEP_TITLES[step])}
      </h1>

      <div className="flex-1">
        {step === 'grade' ? (
          <div role="radiogroup" aria-label={t('chooseGrade')} className="grid grid-cols-2 gap-3">
            {options.gradeLevels.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={draft.gradeLevel === g}
                onClick={() => update({ gradeLevel: g, stream: needsStream(g) ? draft.stream : null })}
                className={cn(
                  'mq-press min-h-[72px] rounded-lg border border-line bg-paper text-lg font-extrabold shadow-ledge-secondary',
                  draft.gradeLevel === g && 'border-green bg-green text-paper shadow-ledge-primary',
                )}
              >
                {t('chooseGrade')} {g}
              </button>
            ))}
          </div>
        ) : null}

        {step === 'stream' ? (
          <div role="radiogroup" aria-label={t('onboarding.streamTitle')}>
            {options.streams.map((s) => (
              <SheetOption key={s.slug} selected={draft.stream === s.slug} onClick={() => update({ stream: s.slug })}>
                {tOr(`stream.${s.slug}`, s.name)}
              </SheetOption>
            ))}
          </div>
        ) : null}

        {step === 'subjects' ? (
          <>
            <p className="-mt-2 mb-4 text-sm text-muted">{t('onboarding.subjectsHint')}</p>
            <div role="group" aria-label={t('onboarding.subjectsTitle')}>
              {subjects.map((s) => {
                const selected = draft.subjectSlugs.includes(s.slug);
                return (
                  <SheetOption
                    key={s.slug}
                    role="checkbox"
                    selected={selected}
                    onClick={() =>
                      update({
                        subjectSlugs: selected
                          ? draft.subjectSlugs.filter((x) => x !== s.slug)
                          : [...draft.subjectSlugs, s.slug],
                      })
                    }
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {tOr(`subject.${s.slug}`, s.name)}
                      {!s.hasContent ? <Tag>{t('comingSoon')}</Tag> : null}
                    </span>
                  </SheetOption>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 'exam' ? (
          <div role="radiogroup" aria-label={t('onboarding.examTitle')}>
            {options.targetExams.map((exam) => (
              <SheetOption key={exam.slug} selected={draft.targetExam === exam.slug} onClick={() => update({ targetExam: exam.slug })}>
                {tOr(`exam.${exam.slug}`, exam.name)}
              </SheetOption>
            ))}
          </div>
        ) : null}

        {step === 'language' ? (
          <>
            <p className="-mt-2 mb-4 text-sm text-muted">{t('englishOnly')}</p>
            <div role="radiogroup" aria-label={t('onboarding.languageTitle')}>
              {LANGUAGE_OPTIONS.map((o) => (
                <SheetOption
                  key={o.code}
                  selected={draft.interfaceLanguage === o.code}
                  onClick={() => {
                    update({ interfaceLanguage: o.code });
                    setLanguage(o.code);
                  }}
                >
                  <span lang={o.locale} className="block font-bold">
                    {o.nativeName}
                  </span>
                  <small lang="en" className="block text-caption font-normal text-muted">
                    {o.englishName}
                  </small>
                </SheetOption>
              ))}
            </div>
          </>
        ) : null}

        {step === 'goal' ? (
          <>
            <p className="-mt-2 mb-4 text-sm text-muted">{t('onboarding.goalHint')}</p>
            <div role="radiogroup" aria-label={t('onboarding.goalTitle')} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DAILY_GOAL_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={draft.dailyGoalMinutes === m}
                  onClick={() => update({ dailyGoalMinutes: m })}
                  className={cn(
                    'mq-press min-h-[62px] rounded-lg border border-line bg-paper font-extrabold shadow-ledge-secondary',
                    draft.dailyGoalMinutes === m && 'border-green bg-green text-paper shadow-ledge-primary',
                  )}
                >
                  {t('common.minutes', { count: m })}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <label htmlFor="onboarding-name" className="sr-only">
              {t('onboarding.nameTitle')}
            </label>
            <input
              id="onboarding-name"
              value={draft.displayName}
              maxLength={40}
              autoComplete="given-name"
              onChange={(e) => update({ displayName: e.target.value })}
              aria-describedby="onboarding-name-hint"
              aria-invalid={error === 'onboarding.nameInvalid'}
              className="h-[53px] w-full rounded-md border border-line bg-paper px-4 text-base"
            />
            <p id="onboarding-name-hint" className="mt-2 text-sm text-muted">
              {t('onboarding.nameHint')}
            </p>
          </>
        ) : null}
      </div>

      <p role="alert" className="mt-4 min-h-5 text-sm text-retry-ink">
        {error ? t(error) : ''}
      </p>

      <div className="mt-3 flex items-center gap-3">
        {stepIndex > 0 ? (
          <Button
            variant="secondary"
            block={false}
            className="px-5"
            aria-label={t('common.back')}
            onClick={() => {
              setError(null);
              setStepIndex((i) => i - 1);
            }}
          >
            <ArrowLeft className="size-[17px]" aria-hidden="true" />
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={saving} data-testid="onboarding-next">
          {isLast ? t('onboarding.finish') : t('common.continue')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </Button>
      </div>
      {step === 'name' ? (
        <Button
          variant="text"
          block={false}
          className="mx-auto mt-2"
          disabled={saving}
          onClick={() => {
            const skipped = { ...draft, displayName: '' };
            setDraft(skipped);
            void finish(skipped);
          }}
        >
          {t('common.skip')}
        </Button>
      ) : null}
    </form>
  );
}

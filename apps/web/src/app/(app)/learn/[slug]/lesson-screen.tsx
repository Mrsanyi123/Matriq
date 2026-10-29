'use client';

import type { ChapterDetail } from '@matriq/validation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LessonArticle } from '@/components/lesson/lesson-article';
import { MobileSubBar } from '@/components/shell/top-bars';
import { ErrorState } from '@/components/states';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow, SampleNotice, Skeleton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { useMatriq } from '@/lib/api';
import { useStudyTimer } from '@/lib/hooks/use-study-timer';
import { useI18n } from '@/lib/i18n';
import { pad2 } from '@/lib/utils';

export function LessonScreen({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const chapter = useQuery(queries.chapter(slug));
  useStudyTimer(chapter.data?.id);

  const subtitle = chapter.data ? `${t('chapter')} ${chapter.data.number}` : undefined;

  return (
    <div className="mx-auto max-w-reading">
      <MobileSubBar title={t('reading')} subtitle={subtitle} backHref="/learn" backLabel={t('back')} />
      <Link
        href="/learn"
        className="mb-4 hidden min-h-11 items-center gap-1.5 rounded-md pr-2 text-small font-bold text-muted hover:text-green-dark md:inline-flex"
      >
        <ArrowLeft className="size-[17px]" aria-hidden="true" />
        {t('nav.learn')}
      </Link>
      {chapter.isPending ? (
        <LessonSkeleton />
      ) : chapter.isError ? (
        <ErrorState error={chapter.error} onRetry={() => void chapter.refetch()} className="mt-8" />
      ) : (
        <Lesson key={chapter.data.id} chapter={chapter.data} />
      )}
    </div>
  );
}

function Lesson({ chapter }: { chapter: ChapterDetail }) {
  const { t } = useI18n();
  const { api, invalidateLearnerData } = useMatriq();
  const [mode, setMode] = useState<'full' | 'notes'>('full');
  const endRef = useRef<HTMLDivElement>(null);
  const requested = useRef(false);

  const markRead = useMutation({
    mutationFn: () => api.markLessonRead(chapter.id),
    onSuccess: () => invalidateLearnerData({ refetch: false }),
  });

  const requestMarkRead = () => {
    if (requested.current) return;
    requested.current = true;
    markRead.mutate();
  };

  // Reaching the end of the lesson counts as reading it.
  useEffect(() => {
    const target = endRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (!requested.current) {
          requested.current = true;
          markRead.mutate();
        }
        observer.disconnect();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [chapter.id]);

  const sections = mode === 'full' ? chapter.fullLesson : chapter.quickNotes;
  const xp = markRead.data?.xpAwarded ?? 0;

  return (
    <div className="pt-[23px] md:pt-0">
      <header>
        <Eyebrow className="mb-[7px]">
          {t('chapter')} {pad2(chapter.number)}
        </Eyebrow>
        <h1 lang="en" className="text-[28px] font-extrabold">
          {chapter.title}
        </h1>
        <p lang="en" className="mt-2 text-sm text-muted">
          {chapter.tagline}
        </p>
      </header>

      <Segmented
        className="my-[23px]"
        label={t('choice')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'full', label: t('detailed') },
          { value: 'notes', label: t('short') },
        ]}
      />

      {mode === 'full' && chapter.objectives.length > 0 ? (
        <section aria-labelledby="objectives-title" className="mb-7 rounded-lg border border-line bg-paper p-[18px]">
          <h2 id="objectives-title" className="text-small font-bold text-ink">
            {t('lesson.objectives')}
          </h2>
          <ul lang="en" className="mt-2.5 space-y-2">
            {chapter.objectives.map((objective) => (
              <li key={objective} className="flex gap-2.5 text-sm text-body-ink">
                <Check className="mt-0.5 size-[17px] shrink-0 text-green" aria-hidden="true" />
                {objective}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LessonArticle sections={sections} mode={mode} />

      <div ref={endRef} className="border-t border-line pt-5 pb-2">
        <ButtonLink href={`/learn/${chapter.slug}/practice`} onClick={requestMarkRead}>
          {t('tryQuestion')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </ButtonLink>
        <p className="mt-[15px] text-center text-xs text-muted">{t('readHint')}</p>
        <p role="status" className="mt-2 min-h-5 text-center text-xs font-bold text-green-dark">
          {markRead.isSuccess ? (xp > 0 ? t('lesson.readXp', { xp }) : t('readDone')) : ''}
        </p>
      </div>

      <nav aria-label={t('chapters')} className="mt-4 flex gap-3">
        {chapter.previous ? (
          <Link
            href={`/learn/${chapter.previous.slug}`}
            className="flex min-h-[62px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper p-3 text-left"
          >
            <ChevronLeft className="size-5 shrink-0 text-green" aria-hidden="true" />
            <span className="min-w-0">
              <small className="block text-caption font-normal text-muted">{t('lesson.previous')}</small>
              <strong lang="en" className="block truncate text-sm">
                {chapter.previous.title}
              </strong>
            </span>
          </Link>
        ) : null}
        {chapter.next ? (
          <Link
            href={`/learn/${chapter.next.slug}`}
            className="flex min-h-[62px] min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-line bg-paper p-3 text-right"
          >
            <span className="min-w-0">
              <small className="block text-caption font-normal text-muted">{t('nextChapter')}</small>
              <strong lang="en" className="block truncate text-sm">
                {chapter.next.title}
              </strong>
            </span>
            <ChevronRight className="size-5 shrink-0 text-green" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>

      {chapter.isDemo ? <SampleNotice>{t('sampleShort')}</SampleNotice> : null}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div aria-busy="true" className="pt-[23px] md:pt-0">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="my-[23px] h-[53px] w-full rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PracticeRunner } from '@/components/practice/practice-runner';
import { MobileSubBar } from '@/components/shell/top-bars';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { useStudyTimer } from '@/lib/hooks/use-study-timer';
import { useI18n } from '@/lib/i18n';

export function PracticeScreen({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { api, queries } = useMatriq();
  const chapter = useQuery(queries.chapter(slug));
  const chapterId = chapter.data?.id;
  const [attempt, setAttempt] = useState(0);
  const startedFor = useRef<string | null>(null);
  useStudyTimer(chapterId);

  // Starting a session is a write (it creates a session), so it is a mutation.
  const start = useMutation({ mutationFn: (id: string) => api.startChapterPractice(id) });
  const { mutate } = start;

  useEffect(() => {
    if (!chapterId) return;
    const key = `${chapterId}:${attempt}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    mutate(chapterId);
  }, [chapterId, attempt, mutate]);

  const restart = useCallback(() => {
    window.scrollTo({ top: 0 });
    setAttempt((a) => a + 1);
  }, []);

  const subtitle = chapter.data ? `${t('chapter')} ${chapter.data.number}` : undefined;
  const error = chapter.error ?? start.error;

  return (
    <div className="mx-auto max-w-reading">
      <MobileSubBar title={t('practice')} subtitle={subtitle} backHref={`/learn/${slug}`} backLabel={t('back')} />
      <Link
        href={`/learn/${slug}`}
        className="mb-2 hidden min-h-11 items-center gap-1.5 rounded-md pr-2 text-small font-bold text-muted hover:text-green-dark md:inline-flex"
      >
        <ArrowLeft className="size-[17px]" aria-hidden="true" />
        {chapter.data ? <span lang="en">{chapter.data.title}</span> : t('back')}
      </Link>
      {error ? (
        <ErrorState
          className="mt-8"
          error={error}
          onRetry={() => (chapter.isError ? void chapter.refetch() : chapterId && mutate(chapterId))}
        />
      ) : start.data && start.variables === chapterId && !start.isPending ? (
        <PracticeRunner key={start.data.sessionId} set={start.data} onRestart={restart} />
      ) : (
        <PracticeSkeleton />
      )}
    </div>
  );
}

function PracticeSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="mt-5 mb-[25px] h-[7px] w-full" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 mb-[25px] h-8 w-4/5" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[66px] w-full" />
        ))}
      </div>
    </div>
  );
}

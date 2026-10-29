'use client';

import type { ChapterNode, CoursePath } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Check, Zap } from 'lucide-react';
import { CourseSwitch } from '@/components/course-switch';
import { LearningPath } from '@/components/learn/learning-path';
import { EmptyState, ErrorState } from '@/components/states';
import { ButtonLink } from '@/components/ui/button';
import { Card, Eyebrow, PageTitle, SampleNotice, Skeleton } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { pad2 } from '@/lib/utils';

export function LearnScreen() {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const path = useQuery(queries.coursePath());

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <section aria-labelledby="learn-title">
        <PageTitle title={<span id="learn-title">{t('homeTitle')}</span>} subtitle={t('homeSub')} />
        <CourseSwitch />
        {path.isPending ? (
          <PathSkeleton />
        ) : path.isError ? (
          <ErrorState error={path.error} onRetry={() => void path.refetch()} className="mt-6" />
        ) : path.data === null || path.data.chapters.length === 0 ? (
          <EmptyState className="mt-6" title={t('course.empty')} body={t('course.emptyBody')} />
        ) : (
          <PathSection path={path.data} />
        )}
      </section>
      {path.data && path.data.chapters.length > 0 ? <ChapterPanel path={path.data} /> : null}
    </div>
  );
}

function PathSection({ path }: { path: CoursePath }) {
  const { t } = useI18n();
  const current = path.chapters.find((c) => c.id === path.currentChapterId) ?? null;
  const target: ChapterNode | undefined = current ?? path.chapters[0];
  const allDone = path.completedCount === path.chapters.length;
  return (
    <>
      <div className="mt-6 flex items-center justify-between text-xs text-muted">
        <strong className="text-small font-bold text-ink">{t('chapters')}</strong>
        <span>
          {path.completedCount} / {path.chapters.length}
        </span>
      </div>
      <LearningPath chapters={path.chapters} currentChapterId={path.currentChapterId} />
      {target ? (
        <ButtonLink href={`/learn/${target.slug}`} className="mt-1 lg:hidden">
          {t(allDone ? 'review' : 'read')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </ButtonLink>
      ) : null}
      {path.isDemo ? <SampleNotice>{t('sampleShort')}</SampleNotice> : null}
    </>
  );
}

/** Desktop side panel: the highlighted chapter with its objectives. */
function ChapterPanel({ path }: { path: CoursePath }) {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const current = path.chapters.find((c) => c.id === path.currentChapterId) ?? path.chapters[0]!;
  const detail = useQuery(queries.chapter(current.slug));
  const allDone = path.completedCount === path.chapters.length;

  return (
    <aside className="hidden lg:sticky lg:top-[calc(var(--mq-layout-top-bar-height)+32px)] lg:block" aria-labelledby="panel-title">
      <Card className="p-7">
        <Eyebrow>{allDone ? t('allDone') : t('thisChapter')}</Eyebrow>
        <p className="mt-4 text-caption text-muted">
          {t('chapter')} {pad2(current.number)} · <span lang="en">{current.unitTitle}</span>
        </p>
        <h2 id="panel-title" lang="en" className="mt-1 text-title">
          {current.title}
        </h2>
        <p lang="en" className="mt-2 text-sm text-muted">
          {current.tagline}
        </p>
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-small font-bold text-ink">{t('lesson.objectives')}</h3>
          {detail.isPending ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : detail.data ? (
            <ul lang="en" className="mt-3 space-y-2.5">
              {detail.data.objectives.map((objective) => (
                <li key={objective} className="flex gap-2.5 text-sm text-body-ink">
                  <Check className="mt-0.5 size-[17px] shrink-0 text-green" aria-hidden="true" />
                  {objective}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <ButtonLink href={`/learn/${current.slug}`}>
            <BookOpen className="size-[17px]" aria-hidden="true" />
            {t(allDone ? 'review' : 'read')}
          </ButtonLink>
          <ButtonLink href={`/learn/${current.slug}/practice`} variant="secondary">
            <Zap className="size-[17px]" aria-hidden="true" />
            {t('practiceNow')}
          </ButtonLink>
        </div>
        <p className="mt-4 text-center text-caption font-normal text-muted">
          {current.questionCount} {t('questions')}
        </p>
      </Card>
    </aside>
  );
}

function PathSkeleton() {
  return (
    <div aria-busy="true" className="mt-6">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-6 space-y-9">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center gap-4 ${i % 2 ? 'pl-[51px]' : ''}`}>
            <Skeleton className="size-[68px] rounded-node" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

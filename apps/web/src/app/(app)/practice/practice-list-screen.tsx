'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CourseSwitch } from '@/components/course-switch';
import { EmptyState, ErrorState } from '@/components/states';
import { PageTitle, SampleNotice, Skeleton } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { pad2 } from '@/lib/utils';

export function PracticeListScreen() {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const path = useQuery(queries.coursePath());

  return (
    <div className="mx-auto max-w-reading">
      <PageTitle title={t('practiceTitle')} subtitle={t('practiceSub')} />
      <CourseSwitch />
      {path.isPending ? (
        <div className="my-[21px] space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[122px] w-full rounded-lg" />
          ))}
        </div>
      ) : path.isError ? (
        <ErrorState error={path.error} onRetry={() => void path.refetch()} className="mt-6" />
      ) : !path.data || path.data.chapters.length === 0 ? (
        <EmptyState className="mt-6" title={t('course.empty')} body={t('course.emptyBody')} />
      ) : (
        <>
          <ul className="my-[21px] space-y-3">
            {path.data.chapters.map((c) => (
              <li key={c.id} className="overflow-hidden rounded-lg border border-line bg-paper">
                <Link href={`/learn/${c.slug}`} className="flex w-full items-center gap-3.5 px-4 py-[17px] text-left hover:bg-bg">
                  <span className="grid size-[43px] shrink-0 place-items-center rounded-md bg-soft text-[15px] font-extrabold text-green">
                    {c.status === 'completed' ? <Check className="size-5" aria-label={t('done')} /> : pad2(c.number)}
                  </span>
                  <span className="min-w-0">
                    <strong lang="en" className="block text-[15px] leading-[1.35]">
                      {c.title}
                    </strong>
                    <small className="mt-[5px] block text-caption font-normal text-muted">
                      {c.questionCount} {t('questions')}
                    </small>
                  </span>
                  <ChevronRight className="ml-auto size-[18px] shrink-0 text-green" aria-hidden="true" />
                </Link>
                <div className="flex items-center justify-between border-t border-line px-[15px] py-[3px]">
                  <Link
                    href={`/learn/${c.slug}`}
                    className="flex min-h-11 items-center gap-1.5 rounded-md px-1 text-xs font-extrabold text-muted hover:text-green-dark"
                  >
                    <BookOpen className="size-[17px]" aria-hidden="true" />
                    {t('readFirst')}
                    <span className="sr-only">
                      : <span lang="en">{c.title}</span>
                    </span>
                  </Link>
                  <Link
                    href={`/learn/${c.slug}/practice`}
                    className="flex min-h-11 items-center gap-1.5 rounded-md px-1 text-xs font-extrabold text-green-dark hover:bg-soft"
                  >
                    {t('practice')}
                    <span className="sr-only">
                      : <span lang="en">{c.title}</span>
                    </span>
                    <ArrowRight className="size-[17px]" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {path.data.isDemo ? <SampleNotice>{t('sampleShort')}</SampleNotice> : null}
        </>
      )}
    </div>
  );
}

'use client';

import type { ChapterNode, ProgressSummary } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Flame, Globe } from 'lucide-react';
import Link from 'next/link';
import { StatTile } from '@/components/dashboard/dashboard-view';
import { achievementIcon } from '@/components/icons';
import { ErrorState, PageSkeleton } from '@/components/states';
import { PageTitle, SampleNotice, SectionHeading } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { AppMessageKey } from '@/lib/translate';
import { cn, pad2 } from '@/lib/utils';

export function ProgressScreen() {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const progress = useQuery(queries.progress());

  return (
    <div className="mx-auto max-w-[880px]">
      <PageTitle title={t('progressTitle')} subtitle={t('progressSub')} />
      {progress.isPending ? (
        <PageSkeleton cards={4} />
      ) : progress.isError ? (
        <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />
      ) : (
        <ProgressBody data={progress.data} />
      )}
    </div>
  );
}

function ProgressBody({ data }: { data: ProgressSummary }) {
  const { t, tOr, locale } = useI18n();
  const weekday = (date: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
    } catch {
      return date.slice(8);
    }
  };
  const { stats } = data;

  return (
    <>
      <div className="lg:grid lg:grid-cols-2 lg:gap-5">
        <section className="my-[22px] rounded-xl border border-line bg-paper p-[21px] lg:my-0" aria-labelledby="streak-title" data-testid="streak-card">
          <div className="flex items-center gap-[15px]">
            <span className="grid size-[55px] place-items-center rounded-lg bg-orb-bg text-orange" aria-hidden="true">
              <Flame className="size-[30px] fill-flame-fill" strokeWidth={1.9} />
            </span>
            <div>
              <h2 id="streak-title" className="text-[25px] font-bold">
                <span className="text-orange">{stats.streakDays}</span>{' '}
                <span className="text-base font-semibold">{t('days')}</span>
              </h2>
              <p className="mt-1 text-xs text-muted">{t('homeSub')}</p>
            </div>
          </div>
          <ol className="mt-[22px] flex justify-between gap-1.5" aria-label={t('stats.streak')}>
            {data.week.map((day) => (
              <li key={day.date} className="flex flex-col items-center gap-[7px] text-[10px] text-muted">
                <span aria-hidden="true">{weekday(day.date)}</span>
                <span
                  className={cn(
                    'grid size-[31px] place-items-center rounded-full border border-line bg-bg text-xs text-node-idle-ink',
                    day.active && 'border-node-done-ledge bg-lime text-green-dark',
                    day.isToday && 'outline-2 outline-offset-3 outline-node-done-ledge',
                  )}
                >
                  {day.active ? <Check className="size-[15px]" aria-hidden="true" /> : Number(day.date.slice(8))}
                  <span className="sr-only">
                    {day.date} {day.active ? t('earned') : ''}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mb-[27px] grid grid-cols-2 gap-3 lg:mb-0 lg:content-start">
          <StatTile testId="progress-xp" value={stats.xpTotal} label={t('xp')} />
          <StatTile testId="progress-questions" value={stats.questionsAnswered} label={t('questionsDone')} />
          <StatTile
            testId="progress-accuracy"
            value={stats.accuracy === null ? t('stats.noAccuracy') : `${stats.accuracy}%`}
            label={t('stats.accuracy')}
          />
          <StatTile
            testId="progress-chapters"
            value={`${stats.chaptersCompleted}/${stats.chaptersTotal}`}
            label={t('chaptersDone')}
          />
        </div>
      </div>

      <SectionHeading title={t('badges')} />
      <ul className="flex gap-3">
        {data.achievements.map((a) => {
          const Icon = achievementIcon(a.iconKey);
          return (
            <li
              key={a.slug}
              data-earned={a.earned}
              className="flex-1 rounded-lg border border-line bg-paper px-[5px] py-4 text-center"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mx-auto mb-2.5 grid size-[46px] place-items-center rounded-lg',
                  a.earned ? 'bg-badge-earned-bg text-badge-earned-ink' : 'bg-badge-bg text-badge-ink',
                )}
              >
                <Icon className="size-[22px]" strokeWidth={1.9} />
              </span>
              <strong className="block text-caption leading-[1.4] font-bold">
                {tOr(`achievement.${a.slug}.title`, a.title)}
              </strong>
              <small className="text-[10px] text-muted">{a.earned ? t('earned') : t('locked')}</small>
            </li>
          );
        })}
      </ul>

      <SectionHeading title={t('myChapters')} aside={`${stats.chaptersCompleted} / ${stats.chaptersTotal}`} />
      {data.chapters.length === 0 ? (
        <p className="text-sm text-muted">{t('noneYet')}</p>
      ) : (
        <ul>
          {data.chapters.map((c) => (
            <ChapterRow key={c.id} chapter={c} />
          ))}
        </ul>
      )}

      <Link
        href="/settings"
        className="mt-6 flex min-h-[50px] w-full items-center justify-between border-t border-line py-2.5 text-small"
      >
        <span className="flex items-center gap-[9px]">
          <Globe className="size-[17px]" aria-hidden="true" />
          {t('appLanguage')}
        </span>
        <ChevronRight className="size-[17px]" aria-hidden="true" />
      </Link>
      {data.isDemo ? <SampleNotice>{t('saved')}</SampleNotice> : null}
    </>
  );
}

const STATUS_KEY: Record<ChapterNode['status'], AppMessageKey> = {
  completed: 'done',
  practising: 'learning',
  reading: 'readDone',
  not_started: 'notStarted',
};

function ChapterRow({ chapter }: { chapter: ChapterNode }) {
  const { t } = useI18n();
  const done = chapter.status === 'completed';
  return (
    <li>
      <Link
        href={`/learn/${chapter.slug}`}
        className="flex w-full items-center gap-3 border-b border-line py-[15px] text-left"
      >
        <span className="grid size-[35px] shrink-0 place-items-center rounded-md bg-soft text-xs font-extrabold text-green">
          {done ? <Check className="size-[17px]" aria-hidden="true" /> : pad2(chapter.number)}
        </span>
        <span className="min-w-0">
          <strong lang="en" className="block text-sm">
            {chapter.title}
          </strong>
          <small className="block text-caption font-normal text-muted">
            {t(STATUS_KEY[chapter.status])}
            {chapter.bestScore !== null ? ` · ${t('progress.best', { score: chapter.bestScore })}` : ''}
          </small>
        </span>
        <ChevronRight className="ml-auto size-[17px] shrink-0 text-decoration" aria-hidden="true" />
      </Link>
    </li>
  );
}

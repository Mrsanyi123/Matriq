'use client';

import { partOfDay } from '@matriq/core';
import type { Dashboard, Recommendation } from '@matriq/validation';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChartNoAxesColumn,
  Flame,
  Layers,
  Leaf,
  LibraryBig,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import type { AppMessageKey } from '@/lib/translate';
import { cn, pad2 } from '@/lib/utils';
import { ButtonLink } from '../ui/button';
import { Card, Eyebrow, ProgressBar, SampleNotice, Tag } from '../ui/primitives';

export function DashboardView({
  data,
  timeZone,
  now = new Date(),
  showSignUpHint = false,
}: {
  data: Dashboard;
  timeZone: string;
  now?: Date;
  /** Offer "create an account" in the demo banner (only when accounts exist). */
  showSignUpHint?: boolean;
}) {
  const { t } = useI18n();
  const greeting = data.displayName
    ? t(`greeting.${partOfDay(now, timeZone)}`, { name: data.displayName })
    : t('greeting.noName');

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-display">{greeting}</h1>
        <p className="mt-[7px] text-sm text-muted">{t('dashboard.subtitle')}</p>
      </header>

      {data.isDemo ? (
        <aside
          aria-label={t('demo.mode')}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted"
        >
          <Tag tone="green">{t('demo.badge')}</Tag>
          <span className="min-w-0 flex-1">{t('demo.note')}</span>
          {showSignUpHint ? (
            <Link href="/settings" className="font-bold text-green-dark underline-offset-2 hover:underline">
              {t('demo.createAccount')}
            </Link>
          ) : null}
        </aside>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ContinueCard data={data} />
        <DailyGoalCard today={data.today} />
      </div>

      <QuickActions />

      <section aria-labelledby="activity-title">
        <h2 id="activity-title" className="mb-3 text-heading">
          {t('dashboard.activity')}
        </h2>
        <StudyStats stats={data.stats} />
      </section>

      <div className={cn('grid gap-5', data.recommendations.length > 0 && 'lg:grid-cols-2')}>
        <ReminderCard reminder={data.nextReminder} timeZone={timeZone} />
        {data.recommendations.length > 0 ? <Recommendations items={data.recommendations} /> : null}
      </div>

      {data.isDemo ? <SampleNotice>{t('sampleShort')}</SampleNotice> : null}
    </div>
  );
}

function ContinueCard({ data }: { data: Dashboard }) {
  const { t } = useI18n();
  const next = data.continueStudying;

  if (!next) {
    return (
      <Card className="flex flex-col justify-center gap-3">
        <Eyebrow>{t('dashboard.continue')}</Eyebrow>
        <p className="text-heading">{data.subject ? t('course.empty') : t('dashboard.noCourse')}</p>
        <p className="text-sm text-muted">{t('course.emptyBody')}</p>
        <ButtonLink href="/learn" variant="secondary" className="mt-2 sm:w-auto sm:self-start">
          {t('change')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </ButtonLink>
      </Card>
    );
  }

  const slug = next.chapter.slug;
  const action = {
    read: { label: t(next.status === 'reading' ? 'continue' : 'dashboard.startReading'), href: `/learn/${slug}`, Icon: BookOpen },
    practice: { label: t('dashboard.practiceNow'), href: `/learn/${slug}/practice`, Icon: Zap },
    review: { label: t('dashboard.reviewNow'), href: `/learn/${slug}`, Icon: RotateCcw },
  }[next.action];

  return (
    <Card className="flex flex-col gap-5 p-6" data-testid="continue-card">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-[68px] shrink-0 place-items-center rounded-node border-4 border-bg bg-node-current text-paper shadow-[var(--mq-ledge-node-current),0_0_0_4px_var(--mq-node-current-ring)]"
        >
          <action.Icon className="size-[27px]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <Eyebrow>{t('dashboard.continue')}</Eyebrow>
          <p className="mt-1.5 text-caption text-muted">
            {next.subjectName} · {t('chapter')} {pad2(next.chapter.number)}
          </p>
          <h2 lang="en" className="mt-1 text-title">
            {next.chapter.title}
          </h2>
          {next.action === 'review' ? <p className="mt-1 text-sm text-muted">{t('dashboard.allDone')}</p> : null}
        </div>
      </div>
      <ButtonLink href={action.href} className="sm:w-auto sm:self-start sm:px-7">
        {action.label}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </ButtonLink>
    </Card>
  );
}

function DailyGoalCard({ today }: { today: Dashboard['today'] }) {
  const { t } = useI18n();
  const left = Math.max(0, today.goalMinutes - today.minutes);
  return (
    <Card className="flex flex-col gap-3" data-testid="daily-goal">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-soft text-green" aria-hidden="true">
          <Target className="size-[22px]" strokeWidth={1.9} />
        </span>
        <h2 className="text-heading">{t('dashboard.dailyGoal')}</h2>
      </div>
      <p className="text-2xl font-extrabold tracking-[-0.5px]">
        {t('dashboard.minutesOf', { minutes: today.minutes, goal: today.goalMinutes })}
      </p>
      <ProgressBar value={today.minutes} max={today.goalMinutes} label={t('dashboard.dailyGoal')} />
      <p className="text-sm text-muted">
        {today.goalMet ? t('dashboard.goalMet') : t('dashboard.goalLeft', { left })}
      </p>
    </Card>
  );
}

const QUICK_ACTIONS: { key: AppMessageKey; href: string; Icon: LucideIcon; ai?: boolean; soon?: boolean }[] = [
  { key: 'action.practice', href: '/practice', Icon: Zap },
  { key: 'action.askAi', href: '/tutor', Icon: Sparkles, ai: true, soon: true },
  { key: 'action.revision', href: '/revision', Icon: Layers, soon: true },
  { key: 'action.videos', href: '/library', Icon: LibraryBig, soon: true },
];

function QuickActions() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-heading">
        {t('dashboard.quickActions')}
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ key, href, Icon, ai, soon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'mq-press flex h-full min-h-[68px] items-center gap-3 rounded-lg border p-3.5 text-sm font-bold',
                ai
                  ? 'border-ai-border bg-ai-bg text-ai-ink'
                  : 'border-line bg-paper text-ink shadow-ledge-secondary active:shadow-ledge-secondary-pressed',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-md',
                  ai ? 'bg-paper text-ai-ink' : 'bg-soft text-green',
                )}
              >
                <Icon className="size-[22px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-tight">{t(key)}</span>
                {soon ? (
                  <span className={cn('mt-1 block text-caption font-semibold', ai ? 'text-ai-ink' : 'text-muted')}>
                    {t('comingSoon')}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StatTile({
  value,
  label,
  icon,
  testId,
}: {
  value: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-[18px]" data-testid={testId}>
      <b className="mb-[3px] flex items-center gap-1.5 text-[27px] leading-tight font-extrabold">
        {icon}
        {value}
      </b>
      <small className="block text-caption font-normal text-muted">{label}</small>
    </div>
  );
}

export function StudyStats({ stats }: { stats: Dashboard['stats'] }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 [&>:first-child]:col-span-2 sm:[&>:first-child]:col-span-1">
      <StatTile
        testId="stat-streak"
        value={<span className="text-orange">{stats.streakDays}</span>}
        icon={<Flame className="size-6 fill-flame-fill stroke-orange" strokeWidth={1.9} aria-hidden="true" />}
        label={t('stats.streak')}
      />
      <StatTile testId="stat-xp" value={stats.xpTotal} label={t('stats.xp')} />
      <StatTile
        testId="stat-chapters"
        value={`${stats.chaptersCompleted}/${stats.chaptersTotal}`}
        label={t('stats.chapters')}
      />
      <StatTile testId="stat-questions" value={stats.questionsAnswered} label={t('stats.questions')} />
      <StatTile
        testId="stat-accuracy"
        value={stats.accuracy === null ? t('stats.noAccuracy') : `${stats.accuracy}%`}
        label={t('stats.accuracy')}
      />
    </div>
  );
}

function ReminderCard({ reminder, timeZone }: { reminder: Dashboard['nextReminder']; timeZone: string }) {
  const { t, locale } = useI18n();
  let when = '';
  if (reminder) {
    try {
      when = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      }).format(new Date(reminder.nextAt));
    } catch {
      when = new Date(reminder.nextAt).toLocaleString();
    }
  }
  return (
    <Card ledge={false} className="flex items-start gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-soft text-green" aria-hidden="true">
        <CalendarClock className="size-[22px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-heading">{t('reminder.upcoming')}</h2>
        {reminder ? (
          <p className="mt-1.5 text-sm text-muted">
            <strong className="text-ink">{reminder.title}</strong> · {when}
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-muted">{t('reminder.none')}</p>
            <Link
              href="/planner"
              className="mt-1 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-small font-extrabold text-green-dark hover:bg-soft"
            >
              {t('reminder.set')}
              <ArrowRight className="size-[17px]" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}

function Recommendations({ items }: { items: Recommendation[] }) {
  const { t, tOr } = useI18n();
  return (
    <Card ledge={false}>
      <h2 className="text-heading">{t('dashboard.recommendations')}</h2>
      <ul className="mt-2 divide-y divide-line">
        {items.slice(0, 2).map((rec) => {
          const text = tOr(rec.messageKey, rec.messageKey, { title: rec.chapter?.title ?? '' });
          const href = rec.chapter
            ? rec.kind === 'practice_chapter'
              ? `/learn/${rec.chapter.slug}/practice`
              : `/learn/${rec.chapter.slug}`
            : '/learn';
          return (
            <li key={rec.id}>
              <Link href={href} className="flex min-h-14 items-center gap-3 py-2.5 text-sm text-ink hover:text-green-dark">
                <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-soft text-green" aria-hidden="true">
                  {rec.kind === 'keep_streak' ? (
                    <ChartNoAxesColumn className="size-[17px]" />
                  ) : (
                    <Leaf className="size-[17px]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">{text}</span>
                <ArrowRight className="size-[17px] shrink-0 text-green" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

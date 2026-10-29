'use client';

import { DisplayNameSchema } from '@matriq/validation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChartNoAxesColumn, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { StatTile } from '@/components/dashboard/dashboard-view';
import { Avatar } from '@/components/shell/account-menu';
import { ErrorState, PageSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, Tag } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function ProfileScreen() {
  const { t, tOr } = useI18n();
  const { api, queries } = useMatriq();
  const profile = useQuery(queries.profile());
  const preferences = useQuery(queries.preferences());
  const options = useQuery(queries.onboardingOptions());
  const dashboard = useQuery(queries.dashboard());

  if (profile.isPending || preferences.isPending) return <PageSkeleton cards={3} />;
  if (profile.isError || preferences.isError) {
    return <ErrorState error={profile.error ?? preferences.error} onRetry={() => void profile.refetch()} />;
  }

  const p = profile.data;
  const prefs = preferences.data;
  const exam = options.data?.targetExams.find((e) => e.slug === prefs.targetExam);
  const subjects = prefs.subjectSlugs
    .map((slug) => tOr(`subject.${slug}`, options.data?.subjects.find((s) => s.slug === slug)?.name ?? slug))
    .join(', ');

  const rows: [string, string][] = [
    [t('chooseGrade'), p.gradeLevel ? String(p.gradeLevel) : '—'],
    ...(p.stream ? [[t('onboarding.streamTitle'), tOr(`stream.${p.stream}`, p.stream)] as [string, string]] : []),
    [t('chooseSubject'), subjects || '—'],
    [t('profile.targetExam'), tOr(`exam.${prefs.targetExam}`, exam?.name ?? prefs.targetExam)],
    [t('settings.dailyGoal'), t('common.minutes', { count: prefs.dailyGoalMinutes })],
  ];

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-5">
      <header className="flex items-center gap-4">
        <Avatar name={p.displayName} className="size-16 text-2xl" />
        <div className="min-w-0">
          <h1 className="truncate text-display">{p.displayName || t('profile.noName')}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            {api.mode === 'demo' ? <Tag tone="green">{t('demo.mode')}</Tag> : t('profile.signedIn')}
          </p>
        </div>
      </header>

      {dashboard.data ? (
        <div className="grid grid-cols-2 gap-3">
          <StatTile value={<span className="text-orange">{dashboard.data.stats.streakDays}</span>} label={t('stats.streak')} />
          <StatTile value={dashboard.data.stats.xpTotal} label={t('stats.xp')} />
        </div>
      ) : null}

      <Card ledge={false}>
        <NameForm current={p.displayName} />
      </Card>

      <Card ledge={false} className="p-0">
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-right text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <nav className="flex flex-col" aria-label={t('nav.profile')}>
        {[
          { href: '/settings', label: t('nav.settings'), Icon: Settings },
          { href: '/progress', label: t('nav.progress'), Icon: ChartNoAxesColumn },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex min-h-[52px] items-center gap-3 border-b border-line text-sm font-bold">
            <Icon className="size-5 text-green" aria-hidden="true" />
            {label}
            <ChevronRight className="ml-auto size-[17px] text-decoration" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NameForm({ current }: { current: string | null }) {
  const { t } = useI18n();
  const { api, invalidateLearnerData } = useMatriq();
  const [value, setValue] = useState(current ?? '');
  const [invalid, setInvalid] = useState(false);
  const save = useMutation({
    mutationFn: (displayName: string) => api.updateProfile({ displayName }),
    onSuccess: () => invalidateLearnerData(),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = DisplayNameSchema.safeParse(value);
        setInvalid(!parsed.success);
        if (parsed.success) save.mutate(parsed.data);
      }}
    >
      <label htmlFor="display-name" className="text-sm font-bold">
        {t('profile.name')}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="display-name"
          value={value}
          maxLength={40}
          autoComplete="nickname"
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'display-name-error' : undefined}
          className="h-[53px] min-w-0 flex-1 rounded-md border border-line bg-paper px-4 text-base"
        />
        <Button type="submit" block={false} variant="secondary" className="px-5" disabled={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
      <p id="display-name-error" role={invalid ? 'alert' : 'status'} className="mt-1.5 min-h-5 text-sm">
        {invalid ? (
          <span className="text-retry-ink">{t('onboarding.nameInvalid')}</span>
        ) : save.isSuccess ? (
          <span className="font-bold text-green-dark">{t('settings.saved')}</span>
        ) : null}
      </p>
    </form>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import Link from 'next/link';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/** Orange flame + streak count (orange is reserved for streaks). */
export function StreakChip() {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const dashboard = useQuery(queries.dashboard());
  const streak = dashboard.data?.stats.streakDays ?? 0;
  return (
    <Link
      href="/progress"
      aria-label={`${streak} ${t('days')}`}
      className="flex min-h-11 items-center gap-1 rounded-md px-1.5 font-extrabold text-orange"
    >
      <Flame className="size-[23px] fill-flame-fill stroke-orange" strokeWidth={1.9} aria-hidden="true" />
      <span aria-hidden="true">{dashboard.data ? streak : '–'}</span>
    </Link>
  );
}

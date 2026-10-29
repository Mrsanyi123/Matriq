'use client';

import { DEFAULT_TIME_ZONE } from '@matriq/types';
import { useQuery } from '@tanstack/react-query';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/primitives';
import { useMatriq } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/env';
import { useI18n } from '@/lib/i18n';

export function HomeScreen() {
  const { queries } = useMatriq();
  const dashboard = useQuery(queries.dashboard());
  const preferences = useQuery(queries.preferences());

  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  return (
    <DashboardView
      data={dashboard.data}
      timeZone={preferences.data?.timeZone ?? DEFAULT_TIME_ZONE}
      showSignUpHint={isSupabaseConfigured}
    />
  );
}

function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-9 w-3/4 max-w-md" />
      <Skeleton className="h-4 w-1/2 max-w-xs" />
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

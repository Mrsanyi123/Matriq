'use client';

import { isMatriqApiError } from '@matriq/api-client';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApiContext, useMatriq } from '@/lib/api';
import { SIDEBAR_COOKIE, setClientCookie } from '@/lib/cookies';
import { useOnline } from '@/lib/hooks/use-online';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Brand } from '../brand';
import { ErrorState, PageSkeleton } from '../states';
import { Button } from '../ui/button';
import { useLeave } from './account-menu';
import { Sidebar } from './sidebar';
import { BottomTabs, DesktopTopBar, MobileTopBar } from './top-bars';

/** Reading and practice screens show their own phone sub bar. */
const READER_ROUTE = /^\/learn\/[^/]+/;

export function AppShell({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const { api, mode } = useApiContext();
  const router = useRouter();

  useEffect(() => {
    if (!mode) router.replace('/welcome');
  }, [mode, router]);

  if (!api) return <FullPageLoading />;
  return <ShellFrame initialCollapsed={initialCollapsed}>{children}</ShellFrame>;
}

function FullPageLoading() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <Brand />
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    </div>
  );
}

function ShellFrame({ initialCollapsed, children }: { initialCollapsed: boolean; children: React.ReactNode }) {
  const { t, setLanguage } = useI18n();
  const { api, queries } = useMatriq();
  const { enterDemo } = useApiContext();
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnline();
  const leave = useLeave();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const profile = useQuery(queries.profile());
  const preferences = useQuery(queries.preferences());

  // Students who have not finished onboarding start there.
  const needsOnboarding = profile.data?.onboarded === false;
  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding');
  }, [needsOnboarding, router]);

  // An expired session sends the student back to sign in.
  useEffect(() => {
    if (isMatriqApiError(profile.error) && profile.error.code === 'unauthorized') {
      void leave();
    }
  }, [profile.error, leave]);

  // The saved interface language wins once preferences load.
  const savedLanguage = preferences.data?.interfaceLanguage;
  useEffect(() => {
    if (savedLanguage) setLanguage(savedLanguage);
  }, [savedLanguage, setLanguage]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    setClientCookie(SIDEBAR_COOKIE, next ? 'collapsed' : 'expanded');
  }

  let content: React.ReactNode = children;
  if (profile.isPending || needsOnboarding) {
    content = <PageSkeleton />;
  } else if (profile.isError) {
    content = (
      <ErrorState error={profile.error} onRetry={() => void profile.refetch()} className="mt-10">
        {isMatriqApiError(profile.error) && profile.error.code === 'not_configured' ? (
          <div className="mt-4 flex w-full flex-col gap-2">
            <Button
              variant="primary"
              onClick={() => {
                enterDemo();
                router.replace('/home');
              }}
            >
              {t('auth.tryDemo')}
            </Button>
            <Button variant="text" block={false} className="mx-auto" onClick={() => void leave()}>
              {t('auth.signOut')}
            </Button>
          </div>
        ) : null}
      </ErrorState>
    );
  }

  const isReader = READER_ROUTE.test(pathname);

  return (
    <div
      data-collapsed={collapsed}
      className={cn(
        'group/shell min-h-dvh md:pl-sidebar-collapsed lg:pl-sidebar lg:data-[collapsed=true]:pl-sidebar-collapsed',
      )}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-green px-4 py-3 font-bold text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('nav.skip')}
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <DesktopTopBar />
        {isReader ? null : <MobileTopBar />}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-content flex-1 px-[22px] pt-2 pb-[calc(var(--mq-layout-mobile-tab-bar-height)+28px+env(safe-area-inset-bottom))] focus:outline-none max-[360px]:px-[17px] md:px-8 md:pt-8 md:pb-14"
        >
          {!online ? (
            <p role="status" className="mx-auto mt-1 mb-3 max-w-reading rounded-sm bg-offline-bg p-2.5 text-center text-caption text-offline-ink">
              {api.mode === 'demo' ? t('offline') : t('offline.needsConnection')}
            </p>
          ) : null}
          <div key={pathname} className="animate-appear">
            {content}
          </div>
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}

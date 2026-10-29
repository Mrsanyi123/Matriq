'use client';

import { MOBILE_TABS } from '@matriq/ui';
import { ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Brand } from '../brand';
import { CourseSwitch } from '../course-switch';
import { NAV_ICONS } from '../icons';
import { LanguageButton } from '../language';
import { AccountMenu, NotificationsMenu } from './account-menu';
import { isActive } from './sidebar';
import { StreakChip } from './streak-chip';

/** Compact desktop/tablet top bar (≥768px). */
export function DesktopTopBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 hidden h-topbar items-center gap-3 border-b border-line bg-bg/95 px-6 backdrop-blur md:flex">
      <CourseSwitch compact className="w-auto" />
      <div className="relative ml-2 hidden max-w-sm flex-1 lg:block">
        <label htmlFor="global-search" className="sr-only">
          {t('top.search')} ({t('comingSoon')})
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-node-idle-ink" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          disabled
          placeholder={t('top.search')}
          aria-describedby="global-search-soon"
          className="h-11 w-full cursor-not-allowed rounded-md border border-line bg-paper pr-24 pl-10 text-sm text-muted placeholder:text-muted/80"
        />
        <span
          id="global-search-soon"
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-xs bg-segmented-track px-2 py-0.5 text-caption text-muted"
        >
          {t('comingSoon')}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <StreakChip />
        <NotificationsMenu />
        <LanguageButton />
        <AccountMenu />
      </div>
    </header>
  );
}

/** Phone top bar (prototype .topbar): brand, streak and language. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-[calc(var(--mq-layout-top-bar-height)+env(safe-area-inset-top))] items-center justify-between bg-bg px-[22px] pt-[max(12px,env(safe-area-inset-top))] pb-3 max-[360px]:px-[17px] md:hidden">
      <Link href="/home" aria-label="Matriq" className="flex min-h-12 items-center rounded-md">
        <Brand />
      </Link>
      <div className="flex items-center gap-2">
        <StreakChip />
        <LanguageButton />
      </div>
    </header>
  );
}

/** Phone sub bar for reading/practice (prototype .subbar). */
export function MobileSubBar({ title, subtitle, backHref, backLabel }: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-[22px] mb-1 flex h-subbar items-center gap-3 border-b border-line bg-bg px-5 max-[360px]:-mx-[17px] md:hidden">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-paper"
      >
        <ChevronLeft className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <strong className="block text-small font-bold">{title}</strong>
        {subtitle ? <small className="block text-caption font-normal text-muted">{subtitle}</small> : null}
      </div>
      <LanguageButton className="border-0 bg-transparent" />
    </header>
  );
}

/** Phone bottom tab bar (prototype .nav) with MOBILE_TABS. */
export function BottomTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav
      aria-label={t('navigation')}
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(var(--mq-layout-mobile-tab-bar-height)+env(safe-area-inset-bottom))] justify-around gap-1.5 border-t border-line bg-paper px-[18px] pt-[9px] pb-[calc(9px+env(safe-area-inset-bottom))] md:hidden"
    >
      {MOBILE_TABS.map((tab) => {
        const Icon = NAV_ICONS[tab.icon];
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-[50px] min-w-0 flex-1 flex-col items-center gap-[3px] text-caption font-extrabold text-muted',
              active && 'text-green-dark',
            )}
          >
            <span
              className={cn(
                'grid h-[29px] w-[57px] max-w-full place-items-center rounded-sm transition-colors group-hover:bg-soft',
                active && 'bg-soft',
              )}
            >
              <Icon className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span className="max-w-full truncate">{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

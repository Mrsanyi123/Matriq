'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { Bell, CircleUserRound, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useApiContext, useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const menuContent =
  'z-50 min-w-60 rounded-lg border border-line bg-paper p-1.5 shadow-floating animate-fade focus:outline-none';
const menuItem =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-sm font-bold text-ink outline-none data-[highlighted]:bg-soft data-[highlighted]:text-green-dark';

/** Leaves the demo or signs out, then returns to the welcome screen. */
export function useLeave() {
  const { leave } = useApiContext();
  const router = useRouter();
  return useCallback(async () => {
    await leave();
    router.replace('/welcome');
    router.refresh();
  }, [leave, router]);
}

export function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full bg-lime font-extrabold text-node-done-ink',
        className,
      )}
    >
      {initial || <CircleUserRound className="size-[22px]" strokeWidth={1.9} />}
    </span>
  );
}

export function AccountMenu() {
  const { t } = useI18n();
  const { api, queries } = useMatriq();
  const profile = useQuery(queries.profile());
  const leave = useLeave();
  const isDemo = api.mode === 'demo';
  const name = profile.data?.displayName;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t('top.account')}
        className="grid size-11 place-items-center rounded-full data-[state=open]:ring-3 data-[state=open]:ring-soft"
      >
        <Avatar name={name} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className={menuContent}>
          <div className="px-3 pt-2 pb-2.5">
            <p className="truncate font-bold text-ink">{name || t('profile.noName')}</p>
            <p className="text-xs text-muted">{isDemo ? t('demo.mode') : t('profile.signedIn')}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Item asChild className={menuItem}>
            <Link href="/profile">
              <CircleUserRound className="size-[18px]" aria-hidden="true" />
              {t('nav.profile')}
            </Link>
          </Menu.Item>
          <Menu.Item asChild className={menuItem}>
            <Link href="/settings">
              <Settings className="size-[18px]" aria-hidden="true" />
              {t('nav.settings')}
            </Link>
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Item className={menuItem} onSelect={() => void leave()}>
            <LogOut className="size-[18px]" aria-hidden="true" />
            {isDemo ? t('demo.exit') : t('auth.signOut')}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Notifications are not built yet; the menu says so honestly. */
export function NotificationsMenu() {
  const { t } = useI18n();
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t('top.notifications')}
        className="grid size-11 place-items-center rounded-md border border-line bg-paper text-muted hover:text-green-dark"
      >
        <Bell className="size-5" strokeWidth={1.9} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className={cn(menuContent, 'max-w-72 p-4')}>
          <Menu.Label className="text-sm font-bold text-ink">{t('top.notifications')}</Menu.Label>
          <p className="mt-1.5 text-sm text-muted">{t('notifications.soon')}</p>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

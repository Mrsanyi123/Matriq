'use client';

import { WEB_NAV, WEB_NAV_FOOTER, type NavItem } from '@matriq/ui';
import * as Tooltip from '@radix-ui/react-tooltip';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Brand } from '../brand';
import { NAV_ICONS } from '../icons';

/** Routes that are honest "coming soon" pages for now. */
export const COMING_SOON_ROUTES = new Set(['/revision', '/library', '/tutor', '/planner']);

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, showTooltip }: { item: NavItem; showTooltip: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = NAV_ICONS[item.icon];
  const label = t(item.labelKey);
  const soon = COMING_SOON_ROUTES.has(item.href);

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/link flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-muted transition-colors hover:bg-soft hover:text-green-dark',
        'md:justify-center lg:justify-start lg:group-data-[collapsed=true]/shell:justify-center',
        active && 'bg-soft text-green-dark',
      )}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span className="truncate md:sr-only lg:not-sr-only lg:group-data-[collapsed=true]/shell:sr-only">{label}</span>
      {soon ? (
        <span className="ml-auto rounded-xs bg-segmented-track px-1.5 py-0.5 text-caption text-muted md:hidden lg:inline lg:group-data-[collapsed=true]/shell:hidden">
          {t('common.soonTag')}
        </span>
      ) : null}
    </Link>
  );

  if (!showTooltip) return link;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-sm bg-toast px-2.5 py-1.5 text-xs font-bold text-paper"
        >
          {label}
          {soon ? ` · ${t('comingSoon')}` : ''}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Desktop sidebar: 248px with labels (≥1024px, collapsible to icons), icons
 * only on tablets (768–1023px), hidden on phones (bottom tabs instead).
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const showTooltip = !isDesktop || collapsed;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-paper md:flex',
        'md:w-sidebar-collapsed lg:w-sidebar lg:group-data-[collapsed=true]/shell:w-sidebar-collapsed',
      )}
    >
      <div className="flex h-topbar shrink-0 items-center justify-between gap-2 px-4 md:justify-center lg:justify-between lg:group-data-[collapsed=true]/shell:justify-center">
        <Link href="/home" aria-label="Matriq" className="rounded-md">
          <Brand className="md:hidden lg:flex lg:group-data-[collapsed=true]/shell:hidden" />
          <Brand compact className="hidden md:flex lg:hidden lg:group-data-[collapsed=true]/shell:flex" />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          className="hidden size-11 place-items-center rounded-md text-muted hover:bg-soft lg:grid lg:group-data-[collapsed=true]/shell:hidden"
        >
          <PanelLeftClose className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
      <nav aria-label={t('navigation')} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {WEB_NAV.map((item) => (
          <SidebarLink key={item.key} item={item} showTooltip={showTooltip} />
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
        {WEB_NAV_FOOTER.map((item) => (
          <SidebarLink key={item.key} item={item} showTooltip={showTooltip} />
        ))}
        <button
          type="button"
          onClick={onToggle}
          aria-label={t('nav.expand')}
          aria-expanded={false}
          className="hidden min-h-11 place-items-center rounded-md text-muted hover:bg-soft lg:group-data-[collapsed=true]/shell:grid"
        >
          <PanelLeftOpen className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

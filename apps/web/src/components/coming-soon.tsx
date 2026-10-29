'use client';

import type { NavItem } from '@matriq/ui';
import { WEB_NAV } from '@matriq/ui';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ICONS } from './icons';
import { ButtonLink } from './ui/button';
import { Tag } from './ui/primitives';

/**
 * Honest placeholder for features that are not built yet. It never fakes the
 * feature; it says so and points back to learning.
 */
export function ComingSoon({ navKey }: { navKey: NavItem['key'] }) {
  const { t } = useI18n();
  const item = WEB_NAV.find((n) => n.key === navKey)!;
  const Icon = NAV_ICONS[item.icon];
  const ai = navKey === 'tutor';

  return (
    <section className="mx-auto flex max-w-md flex-col items-center pt-10 text-center md:pt-16" aria-labelledby="soon-title">
      <span
        aria-hidden="true"
        className={cn(
          'mb-7 grid size-[108px] -rotate-7 place-items-center rounded-frame',
          ai ? 'bg-ai-bg text-ai-ink shadow-[0_7px_0_var(--mq-ai-border)]' : 'bg-reward-bg text-reward-ink shadow-ledge-reward',
        )}
      >
        <Icon className="size-[52px] rotate-7" strokeWidth={1.9} />
      </span>
      <Tag tone={ai ? 'ai' : 'green'}>{t('comingSoon')}</Tag>
      <h1 id="soon-title" className="mt-3 text-display">
        {t(item.labelKey)}
      </h1>
      <p className="mt-3 text-sm text-muted">{t('comingSoon.body')}</p>
      <ButtonLink href="/learn" className="mt-8">
        {t('dashboard.continue')}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </ButtonLink>
      <ButtonLink href="/home" variant="text" block={false} className="mt-2">
        {t('nav.home')}
      </ButtonLink>
    </section>
  );
}

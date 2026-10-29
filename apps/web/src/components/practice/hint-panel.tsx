'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * Progressive hints in the lavender AI card. These are static, pre-written
 * hints labelled "AI help · Demo", not a live AI.
 */
export function HintPanel({
  hints,
  shown,
  onMore,
}: {
  hints: string[];
  shown: number;
  onMore: () => void;
}) {
  const { t } = useI18n();
  if (hints.length === 0) return null;

  if (shown === 0) {
    return (
      <button
        type="button"
        onClick={onMore}
        className="my-[19px] flex min-h-[51px] w-full items-center gap-2.5 rounded-md bg-ai-bg p-3.5 text-left text-small font-extrabold text-ai-ink"
      >
        <Sparkles className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
        {t('hint')}
        <small className="ml-auto rounded-xs border border-ai-border px-1.5 py-0.5 text-[9px] tracking-[0.7px] uppercase">
          {t('demo')}
        </small>
      </button>
    );
  }

  return (
    <aside aria-live="polite" aria-label={t('hintDemo')} className="mt-5 mb-5 rounded-lg border border-tutor-border bg-tutor-bg p-[17px]">
      <strong className="flex items-center gap-1.5 text-caption font-extrabold text-tutor-title">
        <Sparkles className="size-[17px]" strokeWidth={1.9} aria-hidden="true" />
        {t('hintDemo')}
      </strong>
      {hints.slice(0, shown).map((hint, i) => (
        <p key={hint} lang="en" className="mt-2.5 text-sm leading-[1.75] text-tutor-ink" data-testid="hint">
          <b>{i + 1}.</b> {hint}
        </p>
      ))}
      {shown < hints.length ? (
        <button
          type="button"
          onClick={onMore}
          className="mx-auto mt-2.5 flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-extrabold text-ai-ink hover:bg-ai-bg"
        >
          {t('nextHint')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </button>
      ) : null}
    </aside>
  );
}

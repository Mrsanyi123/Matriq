'use client';

import type { AttemptResult } from '@matriq/validation';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type OptionState = 'idle' | 'selected' | 'right' | 'wrong';

/** Visual state of one option, before and after the answer is checked. */
export function optionState(
  optionId: string,
  selectedId: string | null,
  result: Pick<AttemptResult, 'correctOptionId'> | null,
): OptionState {
  if (result) {
    if (optionId === result.correctOptionId) return 'right';
    if (optionId === selectedId) return 'wrong';
    return 'idle';
  }
  return optionId === selectedId ? 'selected' : 'idle';
}

const optionClasses: Record<OptionState, string> = {
  idle: 'border-option-border bg-paper',
  selected: 'border-option-selected-border bg-option-selected-bg',
  right: 'border-right-border bg-right-bg',
  wrong: 'border-wrong-border bg-wrong-bg',
};

/** Prototype answer option: key tile A–D + text; selected/right/wrong states. */
export function AnswerOption({
  label,
  body,
  state,
  chosen,
  checked,
  onSelect,
}: {
  label: string;
  body: string;
  state: OptionState;
  /** True for the student's own choice (still true after checking). */
  chosen: boolean;
  checked: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const filledKey = chosen && (state === 'selected' || state === 'right' || state === 'wrong');
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={checked}
      aria-pressed={chosen}
      data-option-state={state}
      className={cn(
        'flex min-h-[66px] w-full items-center gap-3.5 rounded-lg border-[1.5px] border-b-[3px] px-[15px] py-[13px] text-left text-[17px] transition-colors disabled:cursor-default',
        !checked && 'hover:border-option-selected-border',
        optionClasses[state],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-[31px] shrink-0 place-items-center rounded-sm border border-option-key-border text-xs font-extrabold text-option-key-ink',
          filledKey && state === 'selected' && 'border-transparent bg-option-selected-key text-paper',
          filledKey && state === 'right' && 'border-transparent bg-right-border text-paper',
          filledKey && state === 'wrong' && 'border-transparent bg-wrong-border text-paper',
        )}
      >
        {label}
      </span>
      <span lang="en" className="min-w-0 flex-1">
        {body}
      </span>
      {state === 'right' ? (
        <>
          <Check className="size-[17px] shrink-0 text-right-border" strokeWidth={2.4} aria-hidden="true" />
          <span className="sr-only">{t('correctShort')}</span>
        </>
      ) : null}
      {state === 'wrong' ? <span className="sr-only">{t('practice.yourAnswer')}</span> : null}
    </button>
  );
}

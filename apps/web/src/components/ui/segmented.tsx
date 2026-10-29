'use client';

import { cn } from '@/lib/utils';

/** Prototype segmented control: a track with toggle buttons (aria-pressed). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex gap-1 rounded-md bg-segmented-track p-[5px]', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[43px] flex-1 rounded-sm px-1.5 py-2 text-xs font-extrabold text-ink transition-colors',
              active && 'bg-paper text-green-dark shadow-segmented',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Prototype bottom sheet: slides up from the bottom on phones, a centred
 * dialog on wider screens. Radix provides the focus trap, Escape to close and
 * focus return.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[3px] animate-fade" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-sheet bg-bg px-6 pt-3.5 pb-[calc(26px+env(safe-area-inset-bottom))] shadow-floating animate-sheet focus:outline-none',
            'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[min(460px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sheet md:pb-7',
            className,
          )}
        >
          <div aria-hidden="true" className="mx-auto mb-5 h-1 w-9 rounded-sm bg-node-idle-ledge md:hidden" />
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <Dialog.Title className="text-title">{title}</Dialog.Title>
            <Dialog.Close
              className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-paper"
              aria-label={t('close')}
            >
              <X className="size-[17px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="mb-5 text-small font-normal text-muted">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A selectable row inside a sheet (prototype .sheet-option). */
export function SheetOption({
  selected,
  children,
  className,
  role = 'radio',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      className={cn(
        'mb-2.5 flex min-h-[62px] w-full items-center gap-3.5 rounded-md border border-line bg-paper p-3.5 text-left text-base',
        selected && 'border-node-done-ledge bg-soft',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-[22px] shrink-0 place-items-center rounded-full border-2',
          selected ? 'border-green bg-green text-paper' : 'border-node-idle-ledge',
        )}
      >
        {selected ? (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

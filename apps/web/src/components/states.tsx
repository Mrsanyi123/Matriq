'use client';

import { CloudOff, RotateCcw, Sprout } from 'lucide-react';
import { errorMessageKey } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Skeleton } from './ui/primitives';

export function ErrorState({
  error,
  onRetry,
  className,
  children,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className={cn('mx-auto flex max-w-md flex-col items-center rounded-xl border border-line bg-paper p-7 text-center', className)}
    >
      <span className="mb-4 grid size-14 place-items-center rounded-lg bg-retry-bg text-retry-ink">
        <CloudOff className="size-7" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h2 className="text-heading">{t('common.error')}</h2>
      <p className="mt-2 text-sm text-muted">{t(errorMessageKey(error))}</p>
      {onRetry ? (
        <Button variant="secondary" block={false} className="mt-5 px-6" onClick={onRetry}>
          <RotateCcw className="size-[17px]" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-node-idle-ledge bg-paper p-7 text-center', className)}>
      <span className="mb-4 grid size-14 place-items-center rounded-lg bg-soft text-green">
        <Sprout className="size-7" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <h2 className="text-heading">{title}</h2>
      {body ? <p className="mt-2 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5 w-full">{action}</div> : null}
    </div>
  );
}

/** Generic page skeleton: title, subtitle and a few cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-xs" />
      <div className="mt-7 grid gap-4">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

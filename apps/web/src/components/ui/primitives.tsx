import { cn } from '@/lib/utils';

/** White rounded card with the prototype's soft "card ledge". */
export function Card({
  className,
  ledge = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ledge?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-paper p-5',
        ledge && 'shadow-ledge-card',
        className,
      )}
      {...props}
    />
  );
}

/** Uppercase green label ("CHAPTER 01"). */
export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <p className={cn('text-eyebrow uppercase text-green', className)} {...props} />;
}

/** Small rounded tag, e.g. "Demo" or "Coming soon". */
export function Tag({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'ai' | 'green' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs px-[7px] py-[3px] text-caption',
        tone === 'neutral' && 'bg-segmented-track text-muted',
        tone === 'ai' && 'border border-ai-border text-ai-ink uppercase tracking-[0.7px]',
        tone === 'green' && 'bg-soft text-green-dark',
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn('h-[7px] overflow-hidden rounded-sm bg-progress-track', className)}
    >
      <span
        className="block h-full rounded-sm bg-progress-fill transition-[width] duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-segmented-track', className)} />;
}

/** "Sample content. Not official exam material." */
export function SampleNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('mx-2 mt-6 mb-1 text-center text-caption font-normal text-muted', className)}>{children}</p>
  );
}

export function PageTitle({
  title,
  subtitle,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-[18px]', className)}>
      <h1 className="text-display">{title}</h1>
      {subtitle ? <p className="mt-[7px] text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  aside,
  className,
  as: As = 'h2',
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('mt-[22px] mb-[14px] flex items-center justify-between gap-3', className)}>
      <As className="text-heading">{title}</As>
      {aside ? <span className="text-xs text-muted">{aside}</span> : null}
    </div>
  );
}

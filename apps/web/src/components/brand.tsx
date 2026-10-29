import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Leaf in a rotated green blob + "matriq" + lime dot (prototype .brand). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-[34px] w-[31px] shrink-0 -rotate-8 place-items-center rounded-t-sm rounded-br-md rounded-bl-xs bg-green text-paper',
        className,
      )}
    >
      <Leaf className="size-[22px] rotate-8" strokeWidth={1.9} />
    </span>
  );
}

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark />
      {compact ? (
        <span className="sr-only">Matriq</span>
      ) : (
        <span className="text-[26px] leading-none font-black tracking-[-1.5px] text-ink">
          matriq<span className="ml-px text-decoration">.</span>
        </span>
      )}
    </span>
  );
}

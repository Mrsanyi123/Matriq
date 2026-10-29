import Link from 'next/link';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'text';

const base =
  'mq-press inline-flex items-center justify-center gap-2 text-center font-bold disabled:opacity-48 aria-disabled:opacity-48 disabled:cursor-default';

const variants: Record<ButtonVariant, string> = {
  primary:
    'min-h-[53px] rounded-lg border border-transparent bg-green px-[18px] py-3 text-label text-paper shadow-ledge-primary active:shadow-ledge-primary-pressed disabled:active:shadow-ledge-primary',
  secondary:
    'min-h-[53px] rounded-lg border border-line bg-paper px-[18px] py-3 text-label text-ink shadow-ledge-secondary active:shadow-ledge-secondary-pressed',
  quiet: 'min-h-[53px] rounded-lg bg-soft px-[18px] py-3 text-label text-green-dark',
  text: 'min-h-11 gap-1.5 rounded-md px-2 text-small font-extrabold text-green-dark hover:bg-soft',
};

export function buttonClasses(variant: ButtonVariant = 'primary', block = true, className?: string) {
  return cn(base, variants[variant], block && variant !== 'text' && 'w-full', className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', block = true, className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, block, className)} {...props} />;
});

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  block?: boolean;
};

export function ButtonLink({ variant = 'primary', block = true, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, block, className)} {...props} />;
}

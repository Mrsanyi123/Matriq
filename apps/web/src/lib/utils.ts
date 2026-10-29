import { elevation, ledge, radius, typography } from '@matriq/ui';
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Teach tailwind-merge the Matriq theme, otherwise `text-display` (a size)
// and `text-ink` (a colour) would be treated as conflicting classes.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: Object.keys(typography),
      radius: Object.keys(radius),
      shadow: [
        ...Object.keys(ledge).flatMap((k) => [`ledge-${kebab(k)}`, `ledge-${kebab(k)}-pressed`]),
        ...Object.keys(elevation).map(kebab),
      ],
      spacing: ['sidebar', 'sidebar-collapsed', 'topbar', 'subbar', 'tabbar'],
      container: ['content', 'reading'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "01", "02"… as used for chapter numbers in the prototype. */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

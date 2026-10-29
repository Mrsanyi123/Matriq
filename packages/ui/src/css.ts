import { palette, radius } from './tokens';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * CSS custom properties for every palette and radius token, e.g.
 * `--mq-green-dark: #3d662e`. The web app injects this into `:root` and maps
 * the variables into its Tailwind theme.
 */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) vars[`--mq-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(radius)) vars[`--mq-radius-${key}`] = `${value}px`;
  return vars;
}

/** `:root { … }` block for the CSS variables above. */
export function cssVariablesBlock(selector = ':root'): string {
  const body = Object.entries(cssVariables())
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}\n`;
}

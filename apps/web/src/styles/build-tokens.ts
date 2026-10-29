import { cssVariablesBlock, elevation, layout, ledge, motion, palette, radius, typography } from '@matriq/ui';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Builds `tokens.css`: the `@matriq/ui` tokens as CSS custom properties plus
 * the Tailwind v4 theme that maps utilities (`bg-green`, `rounded-lg`,
 * `shadow-ledge-primary`, `text-display`…) onto them.
 *
 * The default Tailwind colour and radius scales are cleared, so only Matriq
 * tokens can be used in class names. `tokens.test.ts` fails when the
 * committed file is out of date; regenerate with `pnpm --filter @matriq/web tokens`.
 */
export function buildTokensCss(): string {
  const extraRoot: string[] = [];
  for (const [key, value] of Object.entries(ledge)) {
    extraRoot.push(`  --mq-ledge-${kebab(key)}: 0 ${value.offsetY}px 0 ${value.color};`);
    extraRoot.push(`  --mq-ledge-${kebab(key)}-pressed: 0 1px 0 ${value.color};`);
  }
  for (const [key, value] of Object.entries(elevation)) {
    extraRoot.push(`  --mq-elevation-${kebab(key)}: ${value};`);
  }
  for (const [key, value] of Object.entries(layout)) {
    extraRoot.push(`  --mq-layout-${kebab(key)}: ${value}px;`);
  }
  extraRoot.push(`  --mq-motion-fast: ${motion.fast}ms;`);
  extraRoot.push(`  --mq-motion-base: ${motion.base}ms;`);
  extraRoot.push(`  --mq-motion-easing: ${motion.easing};`);

  const theme: string[] = [];
  // Colour names that clash with type-scale names (`text-label`, `text-body`)
  // get an `-ink` suffix so each utility maps to exactly one token.
  for (const key of Object.keys(palette)) {
    const name = key in typography ? `${kebab(key)}-ink` : kebab(key);
    theme.push(`  --color-${name}: var(--mq-${kebab(key)});`);
  }
  for (const key of Object.keys(radius)) theme.push(`  --radius-${key}: var(--mq-radius-${key});`);
  for (const key of Object.keys(ledge)) {
    theme.push(`  --shadow-ledge-${kebab(key)}: var(--mq-ledge-${kebab(key)});`);
    theme.push(`  --shadow-ledge-${kebab(key)}-pressed: var(--mq-ledge-${kebab(key)}-pressed);`);
  }
  for (const key of Object.keys(elevation)) theme.push(`  --shadow-${kebab(key)}: var(--mq-elevation-${kebab(key)});`);
  for (const [key, t] of Object.entries(typography)) {
    theme.push(`  --text-${key}: ${t.size}px;`);
    theme.push(`  --text-${key}--line-height: ${t.lineHeight}px;`);
    theme.push(`  --text-${key}--letter-spacing: ${t.letterSpacing}px;`);
    theme.push(`  --text-${key}--font-weight: ${t.weight};`);
  }
  theme.push(`  --spacing-sidebar: var(--mq-layout-sidebar-width);`);
  theme.push(`  --spacing-sidebar-collapsed: var(--mq-layout-sidebar-collapsed-width);`);
  theme.push(`  --spacing-topbar: var(--mq-layout-top-bar-height);`);
  theme.push(`  --spacing-subbar: var(--mq-layout-sub-bar-height);`);
  theme.push(`  --spacing-tabbar: var(--mq-layout-mobile-tab-bar-height);`);
  theme.push(`  --container-content: var(--mq-layout-content-max-width);`);
  theme.push(`  --container-reading: var(--mq-layout-reading-max-width);`);
  theme.push(`  --ease-matriq: var(--mq-motion-easing);`);

  const root = cssVariablesBlock().replace(/\n}\n$/, `\n${extraRoot.join('\n')}\n}\n`);

  return [
    '/* GENERATED from @matriq/ui by src/styles/build-tokens.ts. Do not edit by hand.',
    ' * Regenerate: pnpm --filter @matriq/web tokens */',
    root,
    '@theme {',
    '  --color-*: initial;',
    '  --radius-*: initial;',
    '}',
    '',
    '@theme inline {',
    ...theme,
    '}',
    '',
  ].join('\n');
}

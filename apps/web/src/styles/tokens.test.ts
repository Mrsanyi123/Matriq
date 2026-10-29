// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { palette } from '@matriq/ui';
import { describe, expect, it } from 'vitest';
import { buildTokensCss } from './build-tokens';

const file = fileURLToPath(new URL('./tokens.css', import.meta.url));

describe('tokens.css', () => {
  it('is generated from @matriq/ui and up to date', () => {
    const expected = buildTokensCss();
    if (process.env.UPDATE_TOKENS) writeFileSync(file, expected);
    expect(readFileSync(file, 'utf8')).toBe(expected);
  });

  it('exposes every palette colour as a Tailwind colour', () => {
    const css = buildTokensCss();
    expect(css).toContain(`--mq-green-dark: ${palette.greenDark};`);
    expect(css).toContain('--color-green-dark: var(--mq-green-dark);');
    expect(css).toContain('--color-*: initial;');
  });
});

import { describe, expect, it } from 'vitest';
import { contrastRatio, cssVariables, palette } from './index';

/** Text/background pairs used in the UI and the WCAG level each must meet. */
const pairs: [name: string, fg: string, bg: string, min: number][] = [
  ['ink on bg', palette.ink, palette.bg, 4.5],
  ['muted on bg', palette.muted, palette.bg, 4.5],
  ['muted on paper', palette.muted, palette.paper, 4.5],
  ['body on bg', palette.body, palette.bg, 4.5],
  ['label on bg', palette.label, palette.bg, 4.5],
  ['white on primary button', palette.paper, palette.green, 4.5],
  ['dark green on soft', palette.greenDark, palette.soft, 4.5],
  ['green eyebrow on bg', palette.green, palette.bg, 4.5],
  ['AI ink on AI bg', palette.aiInk, palette.aiBg, 4.5],
  ['tutor ink on tutor bg', palette.tutorInk, palette.tutorBg, 4.5],
  ['success ink on success bg', palette.successInk, palette.successBg, 4.5],
  ['retry ink on retry bg', palette.retryInk, palette.retryBg, 4.5],
  ['offline ink on offline bg', palette.offlineInk, palette.offlineBg, 4.5],
  ['streak orange on bg (large/bold)', palette.orange, palette.bg, 3],
  ['earned badge ink on badge bg (icon)', palette.badgeEarnedInk, palette.badgeEarnedBg, 3],
  ['white on toast', palette.paper, palette.toast, 4.5],
];

describe('palette contrast', () => {
  it.each(pairs)('%s meets WCAG', (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('cssVariables', () => {
  it('exposes kebab-case custom properties', () => {
    const vars = cssVariables();
    expect(vars['--mq-green-dark']).toBe('#3d662e');
    expect(vars['--mq-radius-xl']).toBe('22px');
  });
});

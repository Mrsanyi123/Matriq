/**
 * Renders the launcher icon, adaptive icon layers, splash mark and favicon
 * from the brand mark (leaf in a rotated green blob, see DESIGN_SYSTEM.md).
 *
 *   node scripts/generate-assets.mjs
 *
 * Needs Playwright with Chromium (e.g. NODE_PATH=$(npm root -g)). Only the alpha
 * channel of the monochrome layer matters. Colours come from @matriq/ui tokens.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { palette } from '../../../packages/ui/src/tokens.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'assets');
mkdirSync(out, { recursive: true });

// Lucide-style leaf (24×24 viewBox, stroked), as in the prototype.
const leaf = (color, width) =>
  `<path d="M20 4C11 4 5 7 5 14a6 6 0 0 0 6 6c8 0 9-8 9-16ZM5 20c3-4 7-7 12-9" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** The brand blob (31×34, radius 11 11 14 4, rotated −8°) scaled to `size`. */
function brandMark(size, { blob = palette.green, ink = palette.paper } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
    <g transform="translate(20 20) rotate(-8)">
      <path d="M-4.5 -17 H4.5 A11 11 0 0 1 15.5 -6 V3 A14 14 0 0 1 1.5 17 H-11.5 A4 4 0 0 1 -15.5 13 V-6 A11 11 0 0 1 -4.5 -17 Z" fill="${blob}"/>
      <g transform="rotate(8) translate(-11 -11) scale(${22 / 24})">${leaf(ink, 1.9)}</g>
    </g>
  </svg>`;
}

const files = [
  // Legacy/iOS icon: full-bleed green with a large white leaf.
  {
    name: 'icon.png',
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24"><rect width="24" height="24" fill="${palette.green}"/><g transform="translate(5.5 5.5) scale(0.54)">${leaf(palette.paper, 2.1)}</g></svg>`,
  },
  // Adaptive icon foreground: leaf inside the 66% safe zone, transparent bg.
  {
    name: 'adaptive-icon.png',
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24"><g transform="translate(7.2 7.2) scale(0.4)">${leaf(palette.paper, 2.2)}</g></svg>`,
  },
  {
    name: 'adaptive-icon-monochrome.png',
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24"><g transform="translate(7.2 7.2) scale(0.4)">${leaf(palette.ink, 2.2)}</g></svg>`,
  },
  // Splash: the brand mark on the app background (set in app.config.ts).
  { name: 'splash-icon.png', size: 512, svg: brandMark(512) },
  { name: 'favicon.png', size: 48, svg: brandMark(48) },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of files) {
  await page.setViewportSize({ width: file.size, height: file.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${file.svg.replace(/width="\d+" height="\d+"/, `width="${file.size}" height="${file.size}"`)}</body></html>`,
  );
  await page.locator('svg').screenshot({ path: join(out, file.name), omitBackground: true });
  console.log('wrote', file.name);
}
await browser.close();

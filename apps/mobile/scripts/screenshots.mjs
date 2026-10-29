/**
 * Visual verification aid (not a test of the native app): serves a web export
 * and drives the demo flow with Playwright at 390×844, saving screenshots to
 * apps/mobile/screenshots/.
 *
 *   npx expo export --platform web --output-dir <dir>
 *   NODE_PATH=$(npm root -g) node scripts/screenshots.mjs <dir>
 *
 * React Native Web renders `testID` as `data-testid`.
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = process.argv[2];
if (!root || !existsSync(root)) throw new Error('Pass the web export directory');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');
mkdirSync(out, { recursive: true });

const types = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.css': 'text/css' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(root, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const id = (testId) => page.locator(`[data-testid="${testId}"]`).first();
const tap = async (testId) => {
  await id(testId).click();
  await page.waitForTimeout(350);
};
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log('saved', name);
};
/** Scrolls the visible screen's ScrollView so `testId` is in view. */
const reveal = async (testId) => {
  await id(testId).scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
};

await page.goto(base);
await id('welcome-screen').waitFor();
await shot('01-welcome');

await tap('try-demo');
await id('onboarding-grade-12').waitFor();
await tap('onboarding-grade-12');
await shot('02-onboarding-grade');
await tap('onboarding-next');
await tap('onboarding-stream-natural_science');
await tap('onboarding-next');
await tap('onboarding-subject-mathematics');
await tap('onboarding-subject-physics');
await shot('03-onboarding-subjects');
await tap('onboarding-next');
await tap('onboarding-exam-euee');
await tap('onboarding-next');
await tap('onboarding-language-en');
await tap('onboarding-next');
await tap('onboarding-goal-20');
await tap('onboarding-next');
await id('onboarding-name-input').fill('Selam');
await tap('onboarding-next');

await id('home-screen').waitFor();
await shot('04-home');
await reveal('stat-accuracy');
await shot('05-home-activity');

await tap('tab-learn');
await id('path-stop-1').waitFor();
await shot('06-learn-path');

await tap('path-stop-1');
await id('lesson-screen').waitFor();
await shot('07-lesson');
await reveal('function-plot');
await shot('08-lesson-plot');
await page.locator('[data-testid="lesson-screen"] [data-testid="mode-short"]').click();
await page.waitForTimeout(300);
await shot('09-lesson-quick-notes');

await page.locator('[data-testid="practice-chapter"]').last().click();
await id('question-prompt').waitFor();
await shot('10-practice');
await tap('hint-button');
await tap('next-hint');
await tap('option-B');
await shot('11-practice-hint-selected');
await tap('check-button');
await reveal('next-button');
await shot('12-practice-feedback-wrong');
await tap('next-button');
await tap('option-D');
await tap('check-button');
await reveal('next-button');
await shot('13-practice-feedback-correct');
await tap('next-button');
await tap('option-B');
await tap('check-button');
await tap('next-button');
await id('results-title').waitFor();
await shot('14-results');

await tap('back-to-chapters');
await page.waitForTimeout(500);
await shot('15-learn-after');

await page.goto(`${base}/progress`);
await id('progress-screen').waitFor();
await shot('16-progress');
await reveal('progress-row-3-not_started');
await shot('17-progress-chapters');

await id('language-button').click();
await id('language-sheet').waitFor();
await shot('18-language-sheet');
await id('language-am').click();
await page.waitForTimeout(600);
await page.goto(`${base}/`);
await id('home-screen').waitFor();
await shot('19-home-amharic');
await id('language-button').click();
await id('language-en').click();
await page.waitForTimeout(400);

await page.goto(`${base}/learn`);
await id('course-switch').waitFor();
await id('course-switch').click();
await id('course-sheet').waitFor();
await shot('20-course-sheet');
await page.keyboard.press('Escape');

await page.goto(`${base}/profile`);
await id('profile-screen').waitFor();
await shot('21-profile');
await page.goto(`${base}/settings`);
await id('settings-screen').waitFor();
await shot('22-settings');

// Offline banner. On Chromium, NetInfo listens to navigator.connection
// "change" events (on Android it uses ConnectivityManager).
await page.goto(`${base}/`);
await id('home-screen').waitFor();
await page.context().setOffline(true);
const ping = () =>
  page.evaluate(() => (navigator.connection ?? window).dispatchEvent(new Event(navigator.connection ? 'change' : navigator.onLine ? 'online' : 'offline')));
await ping();
await page.waitForTimeout(800);
await shot('23-home-offline');
await page.context().setOffline(false);
await ping();

// Narrow phone (320dp): compact gutter, path still fits.
await page.setViewportSize({ width: 320, height: 700 });
await page.goto(`${base}/learn`);
await id('path-stop-1').waitFor();
await shot('24-learn-320');
await page.setViewportSize({ width: 390, height: 844 });

await page.goto(`${base}/tutor`);
await id('coming-soon').waitFor();
await shot('25-ai-tutor-coming-soon');

await browser.close();
server.close();
if (errors.length) {
  console.log('\nBrowser errors:\n' + [...new Set(errors)].join('\n'));
}

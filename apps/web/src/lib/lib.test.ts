// @vitest-environment node
import { MatriqApiError } from '@matriq/api-client';
import { describe, expect, it } from 'vitest';
import { errorMessageKey, shouldRetry } from './errors';
import { routeDecision } from './routes';
import { ActiveTimeTracker, FLUSH_EVERY_SECONDS } from './study-time';
import { isAppMessageKey, translateApp, translateOr } from './translate';

describe('translateApp', () => {
  it('uses shared translations and the web overlay', () => {
    expect(translateApp('am', 'nav.home')).toBe('መነሻ');
    expect(translateApp('am', 'auth.tryDemo')).toBe('Try the demo without an account');
    expect(translateApp('am', 'lesson.readXp', { xp: 10 })).toBe('Lesson read · +10 XP');
  });

  it('only accepts real keys for runtime lookups', () => {
    expect(isAppMessageKey('rec.keepStreak')).toBe(true);
    expect(isAppMessageKey('toString')).toBe(false);
    expect(translateOr('en', 'subject.unknown', 'Fallback {x}', { x: 1 })).toBe('Fallback 1');
    expect(translateOr('en', 'rec.startChapter', '', { title: 'Derivatives' })).toBe(
      'Start “Derivatives” when you are ready.',
    );
  });
});

describe('routeDecision', () => {
  const guest = { signedIn: false, demo: false };
  it('redirects the root', () => {
    expect(routeDecision('/', guest)).toBe('/welcome');
    expect(routeDecision('/', { signedIn: false, demo: true })).toBe('/home');
    expect(routeDecision('/', { signedIn: true, demo: false })).toBe('/home');
  });

  it('protects app routes and allows the demo cookie', () => {
    expect(routeDecision('/learn/derivatives/practice', guest)).toBe('/welcome');
    expect(routeDecision('/onboarding', guest)).toBe('/welcome');
    expect(routeDecision('/learn/derivatives', { signedIn: false, demo: true })).toBeNull();
    expect(routeDecision('/welcome', guest)).toBeNull();
    expect(routeDecision('/welcome', { signedIn: true, demo: false })).toBe('/home');
    expect(routeDecision('/learning-elsewhere', guest)).toBeNull();
  });
});

describe('ActiveTimeTracker', () => {
  it('counts only visible, recently active seconds and chunks them', () => {
    let now = 0;
    const tracker = new ActiveTimeTracker(() => now, 10_000);
    for (let i = 0; i < 5; i++) {
      now += 1000;
      tracker.tick(true);
    }
    tracker.tick(false); // hidden tab
    now += 20_000; // idle
    tracker.tick(true);
    expect(tracker.pendingSeconds).toBe(5);
    expect(tracker.take()).toEqual([5]);
    expect(tracker.take()).toEqual([]);
  });

  it('signals a flush and never exceeds 1800 seconds per call', () => {
    const tracker = new ActiveTimeTracker(() => 0);
    let due = false;
    for (let i = 0; i < 4000; i++) due = tracker.tick(true) || due;
    expect(due).toBe(true);
    expect(FLUSH_EVERY_SECONDS).toBeLessThanOrEqual(1800);
    expect(tracker.take()).toEqual([1800, 1800, 400]);
  });
});

describe('errors', () => {
  it('maps API errors to calm messages and skips pointless retries', () => {
    const notConfigured = new MatriqApiError('not_configured', 'x');
    expect(errorMessageKey(notConfigured)).toBe('error.notConfigured');
    expect(errorMessageKey(new MatriqApiError('not_found', 'x'))).toBe('error.notFound');
    expect(errorMessageKey(new Error('boom'))).toBe('common.error');
    expect(shouldRetry(0, notConfigured)).toBe(false);
    expect(shouldRetry(0, new MatriqApiError('network', 'x'))).toBe(true);
    expect(shouldRetry(2, new Error('boom'))).toBe(false);
  });
});

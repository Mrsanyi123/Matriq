import { createAppTranslator } from '../i18n/translate';
import { createChunkedSecureStorage } from './secure-session-storage';
import { createStudyTimer, MAX_SECONDS_PER_CALL } from './study-time';

describe('createStudyTimer', () => {
  it('counts only active time and splits long sessions into ≤1800s calls', () => {
    let now = 0;
    const recorded: number[] = [];
    const timer = createStudyTimer((s) => recorded.push(s), () => now);

    timer.resume();
    now = 4000 * 1000; // 4000s active
    timer.pause();
    expect(recorded).toEqual([1800, 1800, 400]);
    expect(Math.max(...recorded)).toBeLessThanOrEqual(MAX_SECONDS_PER_CALL);

    // Backgrounded time does not count.
    recorded.length = 0;
    now += 600_000;
    timer.resume();
    now += 30_500;
    timer.flush();
    expect(recorded).toEqual([30]);
    now += 700;
    timer.pause();
    // The leftover 0.5s + 0.7s = 1.2s rounds down to one second.
    expect(recorded).toEqual([30, 1]);
  });

  it('reports nothing under a second', () => {
    let now = 0;
    const record = jest.fn();
    const timer = createStudyTimer(record, () => now);
    timer.resume();
    now = 400;
    timer.pause();
    expect(record).not.toHaveBeenCalled();
  });
});

describe('createChunkedSecureStorage', () => {
  function fakeStore() {
    const data = new Map<string, string>();
    return {
      data,
      getItemAsync: jest.fn(async (k: string) => data.get(k) ?? null),
      setItemAsync: jest.fn(async (k: string, v: string) => {
        if (!/^[\w.-]+$/.test(k)) throw new Error(`invalid key ${k}`);
        data.set(k, v);
      }),
      deleteItemAsync: jest.fn(async (k: string) => {
        data.delete(k);
      }),
    };
  }

  it('round-trips values larger than one SecureStore entry', async () => {
    const store = fakeStore();
    const storage = createChunkedSecureStorage(store as never);
    const session = JSON.stringify({ token: 'x'.repeat(5000) });
    await storage.setItem('sb-abc-auth-token', session);
    expect(store.data.get('sb-abc-auth-token.n')).toBe('3');
    expect(await storage.getItem('sb-abc-auth-token')).toBe(session);

    await storage.setItem('sb-abc-auth-token', 'short');
    expect(store.data.size).toBe(2);
    expect(await storage.getItem('sb-abc-auth-token')).toBe('short');

    await storage.removeItem('sb-abc-auth-token');
    expect(store.data.size).toBe(0);
    expect(await storage.getItem('sb-abc-auth-token')).toBeNull();
  });
});

describe('createAppTranslator', () => {
  it('uses shared translations and falls back to English for mobile-only keys', () => {
    const am = createAppTranslator('am');
    expect(am('nav.home')).not.toBe('Home');
    expect(am('m.auth.or')).toBe('or');
    expect(am('m.practice.questionOf', { current: 2, total: 3 })).toBe('2 / 3');
    expect(createAppTranslator('en')('greeting.morning', { name: 'Selam' })).toBe('Good morning, Selam');
  });
});

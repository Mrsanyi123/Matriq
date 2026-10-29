import { describe, expect, it } from 'vitest';
import { createTranslator, isMessageKey, missingKeys, translate } from './index';

describe('translate', () => {
  it('translates prototype strings', () => {
    expect(translate('en', 'homeTitle')).toBe('Your learning path');
    expect(translate('am', 'back')).toBe('ተመለስ');
    expect(translate('om', 'nav.learn')).toBe('Baradhu');
  });

  it('interpolates values', () => {
    expect(translate('en', 'dashboard.minutesOf', { minutes: 5, goal: 20 })).toBe('5 of 20 min');
    expect(translate('am', 'dashboard.minutesOf', { minutes: 5, goal: 20 })).toBe('5 / 20 ደቂቃ');
  });

  it('falls back to English for missing keys', () => {
    expect(missingKeys('am')).toContain('auth.tryDemo');
    expect(createTranslator('am')('auth.tryDemo')).toBe('Try the demo without an account');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(translate('en', 'greeting.morning', {})).toBe('Good morning, {name}');
  });

  it('narrows runtime keys', () => {
    expect(isMessageKey('rec.keepStreak')).toBe(true);
    expect(isMessageKey('nope')).toBe(false);
    expect(isMessageKey('toString')).toBe(false);
    expect(isMessageKey('__proto__')).toBe(false);
  });
});

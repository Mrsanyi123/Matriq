import { describe, expect, it } from 'vitest';
import type { ChapterNode, Preferences, Profile } from '@matriq/validation';
import {
  accuracy,
  addDays,
  buildDashboard,
  buildWeek,
  computeStreak,
  continueStudying,
  dayOfWeek,
  deriveChapterStatus,
  hasPassed,
  nextOccurrence,
  passMark,
  qualifyingAchievements,
  recommend,
  toLocalDate,
  zonedTimeToUtc,
  type LearnerFacts,
} from './index';

const chapter = (n: number, overrides: Partial<ChapterNode> = {}): ChapterNode => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  slug: `chapter-${n}`,
  number: n,
  title: `Chapter ${n}`,
  tagline: '',
  unitTitle: 'Unit',
  status: 'not_started',
  questionCount: 3,
  bestScore: null,
  ...overrides,
});

describe('dates', () => {
  it('uses the student time zone for the local date', () => {
    // 22:30 UTC is already the next day in Addis Ababa (UTC+3).
    const instant = new Date('2026-10-28T22:30:00Z');
    expect(toLocalDate(instant, 'Africa/Addis_Ababa')).toBe('2026-10-29');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-10-28');
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('converts wall-clock time to UTC', () => {
    expect(zonedTimeToUtc('2026-10-29', '18:00', 'Africa/Addis_Ababa').toISOString()).toBe(
      '2026-10-29T15:00:00.000Z',
    );
    // Daylight saving: New York is UTC-4 in July, UTC-5 in December.
    expect(zonedTimeToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T13:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-12-01T14:00:00.000Z',
    );
  });

  it('knows the day of the week', () => {
    expect(dayOfWeek('2026-10-29')).toBe(4); // Thursday
  });
});

describe('gamification', () => {
  it('requires two thirds correct to pass', () => {
    expect(passMark(3)).toBe(2);
    expect(hasPassed(2, 3)).toBe(true);
    expect(hasPassed(1, 3)).toBe(false);
    expect(hasPassed(0, 0)).toBe(false);
  });

  it('computes accuracy as a whole percentage', () => {
    expect(accuracy(0, 0)).toBeNull();
    expect(accuracy(2, 3)).toBe(67);
  });

  it('keeps yesterday’s streak until today is over', () => {
    const days = ['2026-10-26', '2026-10-27', '2026-10-28'];
    expect(computeStreak(days, '2026-10-29')).toBe(3);
    expect(computeStreak([...days, '2026-10-29'], '2026-10-29')).toBe(4);
    expect(computeStreak(['2026-10-25'], '2026-10-29')).toBe(0);
  });

  it('builds a seven-day week ending today', () => {
    const week = buildWeek(['2026-10-29'], '2026-10-29');
    expect(week).toHaveLength(7);
    expect(week[0]?.date).toBe('2026-10-23');
    expect(week[6]).toEqual({ date: '2026-10-29', active: true, isToday: true });
  });

  it('awards achievements by threshold', () => {
    expect(qualifyingAchievements({ chaptersCompleted: 1, streakDays: 7, correctAnswers: 0 })).toEqual(
      ['first-step', 'seven-days'],
    );
  });
});

describe('learning path', () => {
  it('derives status from progress facts', () => {
    expect(deriveChapterStatus(undefined)).toBe('not_started');
    expect(deriveChapterStatus({ lessonRead: true, practised: false, completed: false })).toBe(
      'reading',
    );
    expect(deriveChapterStatus({ lessonRead: true, practised: true, completed: true })).toBe(
      'completed',
    );
  });

  it('continues with the first unfinished chapter', () => {
    const chapters = [chapter(1, { status: 'completed' }), chapter(2, { status: 'reading' }), chapter(3)];
    expect(continueStudying(chapters, 'Mathematics')).toMatchObject({
      chapter: { number: 2 },
      action: 'practice',
    });
  });

  it('suggests review once everything is complete', () => {
    const chapters = [
      chapter(1, { status: 'completed', bestScore: 100 }),
      chapter(2, { status: 'completed', bestScore: 67 }),
    ];
    expect(continueStudying(chapters, 'Mathematics')).toMatchObject({
      chapter: { number: 2 },
      action: 'review',
    });
  });

  it('returns at most two recommendations, weak chapters first', () => {
    const chapters = [
      chapter(1, { status: 'completed', bestScore: 67 }),
      chapter(2, { status: 'reading' }),
      chapter(3),
    ];
    const recs = recommend({
      chapters,
      chapterAccuracy: { [chapter(1).id]: { attempts: 5, correct: 2 } },
      continueChapterId: chapter(2).id,
      streakDays: 3,
      studiedToday: false,
    });
    expect(recs.map((r) => r.kind)).toEqual(['revisit_weak_chapter', 'start_chapter']);
  });
});

describe('reminders', () => {
  const reminder = {
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    localTime: '18:00',
    timeZone: 'Africa/Addis_Ababa',
    enabled: true,
  };

  it('finds the next matching weekday', () => {
    // Thursday 2026-10-29 10:00 local → Friday 18:00 local.
    const now = new Date('2026-10-29T07:00:00Z');
    expect(nextOccurrence(reminder, now)?.toISOString()).toBe('2026-10-30T15:00:00.000Z');
  });

  it('fires later today if the time has not passed', () => {
    const now = new Date('2026-10-30T07:00:00Z');
    expect(nextOccurrence(reminder, now)?.toISOString()).toBe('2026-10-30T15:00:00.000Z');
  });

  it('ignores disabled reminders', () => {
    expect(nextOccurrence({ ...reminder, enabled: false }, new Date())).toBeNull();
  });
});

describe('buildDashboard', () => {
  const profile: Profile = {
    id: '00000000-0000-4000-8000-000000000099',
    displayName: 'Hana',
    role: 'student',
    isAnonymous: false,
    onboarded: true,
    gradeLevel: 12,
    stream: 'natural_science',
  };
  const preferences: Preferences = {
    interfaceLanguage: 'en',
    dailyGoalMinutes: 20,
    targetExam: 'euee',
    explanationStyle: 'step_by_step',
    timeZone: 'Africa/Addis_Ababa',
    subjectSlugs: ['mathematics'],
    activeSubjectSlug: 'mathematics',
  };
  const facts: LearnerFacts = {
    now: new Date('2026-10-29T09:00:00Z'),
    profile,
    preferences,
    subject: { slug: 'mathematics', name: 'Mathematics', iconKey: 'function' },
    chapters: [chapter(1, { status: 'completed', bestScore: 100 }), chapter(2), chapter(3)],
    activeDates: ['2026-10-28', '2026-10-29'],
    todayStudySeconds: 25 * 60,
    xpTotal: 80,
    questionsAnswered: 4,
    correctAnswers: 3,
    chapterAccuracy: {},
    reminders: [],
    earnedAchievements: {},
    achievementCatalog: [],
    isDemo: true,
  };

  it('assembles a calm dashboard from raw facts', () => {
    const d = buildDashboard(facts);
    expect(d.today).toEqual({ date: '2026-10-29', minutes: 25, goalMinutes: 20, goalMet: true });
    expect(d.stats).toMatchObject({ streakDays: 2, chaptersCompleted: 1, accuracy: 75 });
    expect(d.continueStudying?.chapter.number).toBe(2);
    expect(d.recommendations.length).toBeLessThanOrEqual(2);
    expect(d.nextReminder).toBeNull();
  });
});

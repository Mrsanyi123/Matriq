import { describe, expect, it } from 'vitest';
import { DEMO_CHAPTERS } from '@matriq/demo-content';
import {
  ChapterDetailSchema,
  CoursePathSchema,
  DashboardSchema,
  PracticeSetSchema,
  ProgressSummarySchema,
} from '@matriq/validation';
import { createDemoApi, DEMO_STORAGE_KEY } from './demo-api';
import { createMemoryStorage } from './storage';

const firstChapter = DEMO_CHAPTERS[0]!;

function setup(at = '2026-10-29T07:00:00Z') {
  let current = new Date(at);
  const storage = createMemoryStorage();
  const api = createDemoApi(storage, { now: () => current });
  return { api, storage, setNow: (iso: string) => (current = new Date(iso)) };
}

async function answerAll(api: ReturnType<typeof setup>['api'], correctCount: number) {
  const set = await api.startChapterPractice(firstChapter.id);
  for (const [i, q] of set.questions.entries()) {
    const source = firstChapter.questions.find((x) => x.id === q.id)!;
    const option = source.options.find((o) => o.isCorrect === i < correctCount)!;
    await api.submitAttempt({ sessionId: set.sessionId, questionId: q.id, optionId: option.id });
  }
  return api.completePracticeSession(set.sessionId);
}

describe('demo api', () => {
  it('returns contract-valid data for a new guest', async () => {
    const { api } = setup();
    expect(DashboardSchema.parse(await api.getDashboard()).continueStudying?.action).toBe('read');
    expect(CoursePathSchema.parse(await api.getCoursePath())?.chapters).toHaveLength(3);
    expect(ChapterDetailSchema.parse(await api.getChapter(firstChapter.slug)).next?.number).toBe(2);
    expect(ProgressSummarySchema.parse(await api.getProgress()).achievements).toHaveLength(3);
  });

  it('never exposes correct answers in a practice set', async () => {
    const { api } = setup();
    const set = PracticeSetSchema.parse(await api.startChapterPractice(firstChapter.id));
    expect(JSON.stringify(set)).not.toContain('isCorrect');
    expect(JSON.stringify(set)).not.toContain(firstChapter.questions[0]!.explanation);
  });

  it('completes a chapter at two thirds correct and awards XP once', async () => {
    const { api } = setup();
    await api.markLessonRead(firstChapter.id);
    const result = await answerAll(api, 2);
    expect(result).toMatchObject({ correct: 2, total: 3, passed: true, chapterCompleted: true });
    expect(result.xpAwarded).toBe(50);
    expect(result.newAchievements.map((a) => a.slug)).toEqual(['first-step']);

    const again = await answerAll(api, 3);
    expect(again.xpAwarded).toBe(0);
    expect(again.chapterCompleted).toBe(false);

    const dashboard = await api.getDashboard();
    // 10 lesson + 2×10 first-correct + 50 chapter + 10 for the newly correct third question.
    expect(dashboard.stats.xpTotal).toBe(90);
    expect(dashboard.stats).toMatchObject({ chaptersCompleted: 1, questionsAnswered: 6, accuracy: 83 });
    expect(dashboard.continueStudying?.chapter.number).toBe(2);
  });

  it('does not complete a chapter below the pass mark', async () => {
    const { api } = setup();
    const result = await answerAll(api, 1);
    expect(result).toMatchObject({ passed: false, chapterCompleted: false, xpAwarded: 0 });
    expect((await api.getChapter(firstChapter.slug)).status).toBe('practising');
  });

  it('rejects answers to a finished session', async () => {
    const { api } = setup();
    const set = await api.startChapterPractice(firstChapter.id);
    await api.completePracticeSession(set.sessionId);
    const q = firstChapter.questions[0]!;
    await expect(
      api.submitAttempt({ sessionId: set.sessionId, questionId: q.id, optionId: q.options[0]!.id }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('tracks daily goal minutes and the streak in the student time zone', async () => {
    const { api, setNow } = setup('2026-10-28T08:00:00Z');
    await api.recordStudyTime({ seconds: 600 });
    setNow('2026-10-29T08:00:00Z');
    await api.recordStudyTime({ seconds: 1200 });
    const d = await api.getDashboard();
    expect(d.today).toMatchObject({ minutes: 20, goalMinutes: 20, goalMet: true });
    expect(d.stats.streakDays).toBe(2);
    expect(d.stats.xpTotal).toBe(20); // daily goal bonus only
  });

  it('persists state across instances', async () => {
    const { api, storage } = setup();
    await api.completeOnboarding({
      gradeLevel: 12,
      stream: 'natural_science',
      subjectSlugs: ['mathematics', 'physics'],
      targetExam: 'euee',
      interfaceLanguage: 'am',
      dailyGoalMinutes: 30,
      displayName: 'Hana',
    });
    expect(await storage.getItem(DEMO_STORAGE_KEY)).toContain('Hana');
    const reopened = createDemoApi(storage);
    expect(await reopened.getProfile()).toMatchObject({ onboarded: true, displayName: 'Hana' });
    expect((await reopened.getPreferences()).interfaceLanguage).toBe('am');
  });

  it('has no course for grades without demo content', async () => {
    const { api } = setup();
    await api.updateProfile({ gradeLevel: 10, stream: null });
    expect(await api.getCoursePath()).toBeNull();
    expect((await api.getDashboard()).continueStudying).toBeNull();
  });

  it('schedules reminders', async () => {
    const { api } = setup('2026-10-29T07:00:00Z'); // Thursday
    await api.createReminder({
      title: 'Maths',
      subjectSlug: 'mathematics',
      daysOfWeek: [5],
      localTime: '18:00',
      timeZone: 'Africa/Addis_Ababa',
    });
    expect((await api.getDashboard()).nextReminder?.nextAt).toBe('2026-10-30T15:00:00.000Z');
  });
});

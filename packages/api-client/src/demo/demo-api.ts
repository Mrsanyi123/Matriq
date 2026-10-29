import {
  ACHIEVEMENTS,
  XP_RULES,
  buildDashboard,
  buildProgressSummary,
  currentChapter,
  deriveChapterStatus,
  hasPassed,
  qualifyingAchievements,
  computeStreak,
  toLocalDate,
  type LearnerFacts,
} from '@matriq/core';
import {
  DEMO_CHAPTERS,
  DEMO_EDITION,
  DEMO_UNITS,
  GRADES,
  STREAMS_CATALOG,
  SUBJECTS,
  TARGET_EXAM_CATALOG,
  type DemoChapter,
} from '@matriq/demo-content';
import { DEFAULT_TIME_ZONE } from '@matriq/types';
import {
  CreateReminderInputSchema,
  OnboardingInputSchema,
  RecordStudyTimeInputSchema,
  SubmitAttemptInputSchema,
  UpdatePreferencesInputSchema,
  type Achievement,
  type ChapterDetail,
  type ChapterNode,
  type CoursePath,
  type Preferences,
  type Profile,
  type Reminder,
} from '@matriq/validation';
import { MatriqApiError, type MatriqApi, type UpdateProfileInput } from '../api';
import type { KeyValueStorage } from './storage';

export const DEMO_STORAGE_KEY = 'matriq.demo.v1';
export const DEMO_USER_ID = '00000000-0000-4000-8000-ff0000000001';
const MAX_STORED_ATTEMPTS = 2000;

interface ChapterProgress {
  lessonRead: boolean;
  practised: boolean;
  completed: boolean;
  bestScore: number | null;
}

interface DemoSession {
  chapterId: string;
  /** First answer per question decides the score. */
  answers: Record<string, boolean>;
  completedAt: string | null;
}

export interface DemoState {
  version: 1;
  profile: Pick<Profile, 'displayName' | 'gradeLevel' | 'stream' | 'onboarded'>;
  preferences: Preferences;
  progress: Record<string, ChapterProgress>;
  correctQuestionIds: string[];
  attempts: { questionId: string; chapterId: string; correct: boolean; at: string }[];
  sessions: Record<string, DemoSession>;
  activeDates: string[];
  studySeconds: Record<string, number>;
  dailyGoalAwardedDates: string[];
  xpTotal: number;
  achievements: Record<string, string>;
  reminders: Reminder[];
}

function initialState(): DemoState {
  return {
    version: 1,
    profile: { displayName: null, gradeLevel: 12, stream: 'natural_science', onboarded: false },
    preferences: {
      interfaceLanguage: 'en',
      dailyGoalMinutes: 20,
      targetExam: 'euee',
      explanationStyle: 'step_by_step',
      timeZone: DEFAULT_TIME_ZONE,
      subjectSlugs: ['mathematics'],
      activeSubjectSlug: 'mathematics',
    },
    progress: {},
    correctQuestionIds: [],
    attempts: [],
    sessions: {},
    activeDates: [],
    studySeconds: {},
    dailyGoalAwardedDates: [],
    xpTotal: 0,
    achievements: {},
    reminders: [],
  };
}

/** RFC 4122 v4 UUID; uses crypto when available (Hermes may lack it). */
function randomUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface DemoApiOptions {
  /** Injectable clock for tests. */
  now?: () => Date;
}

/**
 * Guest demo backed by bundled demo content and on-device storage. Answers
 * are checked locally because demo content is public sample material; real
 * accounts check answers on the server.
 */
export function createDemoApi(storage: KeyValueStorage, options: DemoApiOptions = {}): MatriqApi & {
  reset(): Promise<void>;
} {
  const now = options.now ?? (() => new Date());
  let cache: DemoState | null = null;
  // Serialise writes so rapid taps cannot interleave read-modify-write cycles.
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<DemoState> {
    if (cache) return cache;
    let state = initialState();
    try {
      const raw = await storage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DemoState>;
        if (parsed && parsed.version === 1) state = { ...state, ...parsed } as DemoState;
      }
    } catch {
      // Corrupt or unavailable storage: start fresh rather than crash.
    }
    cache = state;
    return state;
  }

  function mutate<T>(fn: (state: DemoState) => T): Promise<T> {
    const run = queue.then(async () => {
      const state = await load();
      const result = fn(state);
      await storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  const today = (s: DemoState) => toLocalDate(now(), s.preferences.timeZone);

  function markActive(s: DemoState) {
    const d = today(s);
    if (!s.activeDates.includes(d)) s.activeDates.push(d);
  }

  function awardXp(s: DemoState, amount: number) {
    s.xpTotal += amount;
    return amount;
  }

  function courseAvailable(s: DemoState, subjectSlug: string | null) {
    return subjectSlug === DEMO_EDITION.subjectSlug && s.profile.gradeLevel === DEMO_EDITION.gradeLevel;
  }

  function chapterNodes(s: DemoState): ChapterNode[] {
    return DEMO_CHAPTERS.map((c) => {
      const p = s.progress[c.id];
      return {
        id: c.id,
        slug: c.slug,
        number: c.number,
        title: c.title,
        tagline: c.tagline,
        unitTitle: DEMO_UNITS.find((u) => u.id === c.unitId)?.title ?? '',
        status: deriveChapterStatus(p),
        questionCount: c.questions.length,
        bestScore: p?.bestScore ?? null,
      };
    });
  }

  function subjectSummary(slug: string | null) {
    const subject = SUBJECTS.find((x) => x.slug === slug);
    return subject ? { slug: subject.slug, name: subject.name, iconKey: subject.iconKey } : null;
  }

  function evaluateAchievements(s: DemoState): Achievement[] {
    const nodes = chapterNodes(s);
    const slugs = qualifyingAchievements({
      chaptersCompleted: nodes.filter((n) => n.status === 'completed').length,
      streakDays: computeStreak(s.activeDates, today(s)),
      correctAnswers: s.attempts.filter((a) => a.correct).length,
    });
    const earnedAt = now().toISOString();
    const fresh: Achievement[] = [];
    for (const slug of slugs) {
      if (s.achievements[slug]) continue;
      s.achievements[slug] = earnedAt;
      const def = ACHIEVEMENTS.find((a) => a.slug === slug)!;
      fresh.push({
        slug,
        title: def.title,
        description: def.description,
        iconKey: def.iconKey,
        earned: true,
        earnedAt,
      });
    }
    return fresh;
  }

  function facts(s: DemoState): LearnerFacts {
    const available = courseAvailable(s, s.preferences.activeSubjectSlug);
    const chapterAccuracy: LearnerFacts['chapterAccuracy'] = {};
    for (const a of s.attempts) {
      const entry = (chapterAccuracy[a.chapterId] ??= { attempts: 0, correct: 0 });
      entry.attempts += 1;
      if (a.correct) entry.correct += 1;
    }
    return {
      now: now(),
      profile: profileOf(s),
      preferences: s.preferences,
      subject: subjectSummary(s.preferences.activeSubjectSlug),
      chapters: available ? chapterNodes(s) : [],
      activeDates: s.activeDates,
      todayStudySeconds: s.studySeconds[today(s)] ?? 0,
      xpTotal: s.xpTotal,
      questionsAnswered: s.attempts.length,
      correctAnswers: s.attempts.filter((a) => a.correct).length,
      chapterAccuracy,
      reminders: s.reminders,
      earnedAchievements: s.achievements,
      achievementCatalog: ACHIEVEMENTS,
      isDemo: true,
    };
  }

  function profileOf(s: DemoState): Profile {
    return {
      id: DEMO_USER_ID,
      role: 'student',
      isAnonymous: true,
      displayName: s.profile.displayName,
      gradeLevel: s.profile.gradeLevel,
      stream: s.profile.stream,
      onboarded: s.profile.onboarded,
    };
  }

  function findChapter(id: string): DemoChapter {
    const chapter = DEMO_CHAPTERS.find((c) => c.id === id);
    if (!chapter) throw new MatriqApiError('not_found', 'Chapter not found');
    return chapter;
  }

  function parseOrThrow<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { message: string } } }, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success) throw new MatriqApiError('validation', result.error.message);
    return result.data;
  }

  return {
    mode: 'demo',

    async reset() {
      await mutate((s) => Object.assign(s, initialState()));
    },

    async getProfile() {
      return profileOf(await load());
    },

    updateProfile: async (input: UpdateProfileInput) =>
      mutate((s) => {
        if (input.displayName !== undefined) s.profile.displayName = input.displayName;
        if (input.gradeLevel !== undefined) s.profile.gradeLevel = input.gradeLevel;
        if (input.stream !== undefined) s.profile.stream = input.stream;
        return profileOf(s);
      }),

    async getPreferences() {
      return (await load()).preferences;
    },

    updatePreferences: async (input) => {
      const patch = parseOrThrow(UpdatePreferencesInputSchema, input);
      return mutate((s) => {
        s.preferences = { ...s.preferences, ...patch };
        return s.preferences;
      });
    },

    async getOnboardingOptions() {
      return {
        gradeLevels: GRADES.map((g) => g.level),
        streams: STREAMS_CATALOG.map(({ slug, name }) => ({ slug, name })),
        subjects: SUBJECTS.map((s) => ({
          slug: s.slug,
          name: s.name,
          iconKey: s.iconKey,
          gradeLevels: s.gradeLevels,
          streams: s.streams,
          hasContent: s.slug === DEMO_EDITION.subjectSlug,
        })),
        targetExams: [...TARGET_EXAM_CATALOG],
      };
    },

    completeOnboarding: async (input) => {
      const data = parseOrThrow(OnboardingInputSchema, input);
      await mutate((s) => {
        s.profile = {
          displayName: data.displayName ?? s.profile.displayName,
          gradeLevel: data.gradeLevel,
          stream: data.stream,
          onboarded: true,
        };
        s.preferences = {
          ...s.preferences,
          interfaceLanguage: data.interfaceLanguage,
          dailyGoalMinutes: data.dailyGoalMinutes,
          targetExam: data.targetExam,
          timeZone: data.timeZone ?? s.preferences.timeZone,
          subjectSlugs: data.subjectSlugs,
          activeSubjectSlug: data.subjectSlugs.includes('mathematics')
            ? 'mathematics'
            : (data.subjectSlugs[0] ?? null),
        };
      });
    },

    async getDashboard() {
      return buildDashboard(facts(await load()));
    },

    async getProgress() {
      return buildProgressSummary(facts(await load()));
    },

    async getCoursePath(subjectSlug) {
      const s = await load();
      const slug = subjectSlug ?? s.preferences.activeSubjectSlug;
      if (!courseAvailable(s, slug)) return null;
      const chapters = chapterNodes(s);
      const path: CoursePath = {
        subject: subjectSummary(slug)!,
        gradeLevel: DEMO_EDITION.gradeLevel,
        editionName: DEMO_EDITION.name,
        isDemo: true,
        chapters,
        completedCount: chapters.filter((c) => c.status === 'completed').length,
        currentChapterId: currentChapter(chapters)?.id ?? null,
      };
      return path;
    },

    async getChapter(slug) {
      const s = await load();
      const index = DEMO_CHAPTERS.findIndex((c) => c.slug === slug);
      const c = DEMO_CHAPTERS[index];
      if (!c) throw new MatriqApiError('not_found', 'Chapter not found');
      const link = (x: DemoChapter | undefined) =>
        x ? { slug: x.slug, number: x.number, title: x.title } : null;
      const detail: ChapterDetail = {
        id: c.id,
        slug: c.slug,
        number: c.number,
        title: c.title,
        tagline: c.tagline,
        unitTitle: DEMO_UNITS.find((u) => u.id === c.unitId)?.title ?? '',
        subjectSlug: DEMO_EDITION.subjectSlug,
        objectives: c.objectives,
        fullLesson: c.fullLesson,
        quickNotes: c.quickNotes,
        status: deriveChapterStatus(s.progress[c.id]),
        questionCount: c.questions.length,
        previous: link(DEMO_CHAPTERS[index - 1]),
        next: link(DEMO_CHAPTERS[index + 1]),
        isDemo: true,
      };
      return detail;
    },

    markLessonRead: async (chapterId) => {
      findChapter(chapterId);
      return mutate((s) => {
        const p = (s.progress[chapterId] ??= {
          lessonRead: false,
          practised: false,
          completed: false,
          bestScore: null,
        });
        markActive(s);
        if (p.lessonRead) return { xpAwarded: 0 };
        p.lessonRead = true;
        return { xpAwarded: awardXp(s, XP_RULES.lesson_read) };
      });
    },

    startChapterPractice: async (chapterId) => {
      const c = findChapter(chapterId);
      const sessionId = randomUuid();
      return mutate((s) => {
        s.sessions[sessionId] = { chapterId, answers: {}, completedAt: null };
        return {
          sessionId,
          chapter: { id: c.id, slug: c.slug, number: c.number, title: c.title },
          questions: c.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options.map(({ id, label, body }) => ({ id, label, body })),
            hints: q.hints,
            origin: 'original_practice' as const,
            examYear: null,
            isDemo: true,
          })),
        };
      });
    },

    submitAttempt: async (input) => {
      const data = parseOrThrow(SubmitAttemptInputSchema, input);
      return mutate((s) => {
        const session = s.sessions[data.sessionId];
        if (!session || session.completedAt) {
          throw new MatriqApiError('conflict', 'Practice session is not active');
        }
        const question = findChapter(session.chapterId).questions.find(
          (q) => q.id === data.questionId,
        );
        const option = question?.options.find((o) => o.id === data.optionId);
        if (!question || !option) throw new MatriqApiError('validation', 'Unknown question or option');

        const isCorrect = option.isCorrect;
        if (!(question.id in session.answers)) session.answers[question.id] = isCorrect;

        s.attempts.push({ questionId: question.id, chapterId: session.chapterId, correct: isCorrect, at: now().toISOString() });
        if (s.attempts.length > MAX_STORED_ATTEMPTS) s.attempts.splice(0, s.attempts.length - MAX_STORED_ATTEMPTS);

        const p = (s.progress[session.chapterId] ??= {
          lessonRead: false,
          practised: false,
          completed: false,
          bestScore: null,
        });
        p.practised = true;
        markActive(s);

        let xpAwarded = 0;
        if (isCorrect && !s.correctQuestionIds.includes(question.id)) {
          s.correctQuestionIds.push(question.id);
          xpAwarded = awardXp(s, XP_RULES.correct_answer);
        }
        return {
          isCorrect,
          correctOptionId: question.options.find((o) => o.isCorrect)!.id,
          explanation: question.explanation,
          xpAwarded,
        };
      });
    },

    completePracticeSession: async (sessionId) =>
      mutate((s) => {
        const session = s.sessions[sessionId];
        if (!session) throw new MatriqApiError('not_found', 'Practice session not found');
        if (session.completedAt) throw new MatriqApiError('conflict', 'Session already completed');
        session.completedAt = now().toISOString();

        const total = findChapter(session.chapterId).questions.length;
        const correct = Object.values(session.answers).filter(Boolean).length;
        const passed = hasPassed(correct, total);
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        const p = (s.progress[session.chapterId] ??= {
          lessonRead: false,
          practised: true,
          completed: false,
          bestScore: null,
        });
        p.bestScore = Math.max(p.bestScore ?? 0, score);

        let xpAwarded = 0;
        let chapterCompleted = false;
        if (passed && !p.completed) {
          p.completed = true;
          chapterCompleted = true;
          xpAwarded += awardXp(s, XP_RULES.chapter_completed);
        }
        return {
          sessionId,
          correct,
          total,
          passed,
          xpAwarded,
          chapterCompleted,
          newAchievements: evaluateAchievements(s),
        };
      }),

    recordStudyTime: async (input) => {
      const data = parseOrThrow(RecordStudyTimeInputSchema, input);
      await mutate((s) => {
        const d = today(s);
        s.studySeconds[d] = (s.studySeconds[d] ?? 0) + data.seconds;
        if (data.seconds >= 60) markActive(s);
        const goalMet = (s.studySeconds[d] ?? 0) >= s.preferences.dailyGoalMinutes * 60;
        if (goalMet && !s.dailyGoalAwardedDates.includes(d)) {
          s.dailyGoalAwardedDates.push(d);
          awardXp(s, XP_RULES.daily_goal_met);
        }
        evaluateAchievements(s);
      });
    },

    async listReminders() {
      return (await load()).reminders;
    },

    createReminder: async (input) => {
      const data = parseOrThrow(CreateReminderInputSchema, input);
      return mutate((s) => {
        const reminder: Reminder = { ...data, id: randomUuid(), enabled: true };
        s.reminders.push(reminder);
        return reminder;
      });
    },

    deleteReminder: async (id) => {
      await mutate((s) => {
        s.reminders = s.reminders.filter((r) => r.id !== id);
      });
    },
  };
}

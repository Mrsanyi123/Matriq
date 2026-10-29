import type { LocalDate } from '@matriq/types';
import type {
  Achievement,
  ChapterNode,
  Dashboard,
  Preferences,
  Profile,
  ProgressSummary,
  Reminder,
  StudyStats,
} from '@matriq/validation';
import { toLocalDate } from './dates';
import { accuracy, buildWeek, computeStreak } from './gamification';
import { continueStudying, countCompleted, recommend, type ChapterAccuracyFacts } from './learning';
import { nextReminder } from './reminders';

/**
 * Everything needed to build the dashboard and progress screens. The Supabase
 * layer and demo mode each gather these facts from their own storage, then
 * share the same assembly logic below.
 */
export interface LearnerFacts {
  now: Date;
  profile: Profile;
  preferences: Preferences;
  subject: { slug: string; name: string; iconKey: string } | null;
  /** Chapters of the active subject, in path order, with derived status. */
  chapters: ChapterNode[];
  /** Local dates with meaningful study activity (answers, lessons, study time). */
  activeDates: LocalDate[];
  todayStudySeconds: number;
  xpTotal: number;
  questionsAnswered: number;
  correctAnswers: number;
  chapterAccuracy: Record<string, ChapterAccuracyFacts>;
  reminders: Reminder[];
  /** Earned achievement slugs mapped to ISO timestamps. */
  earnedAchievements: Record<string, string>;
  achievementCatalog: readonly Pick<Achievement, 'slug' | 'title' | 'description' | 'iconKey'>[];
  isDemo: boolean;
}

export function buildStats(facts: LearnerFacts, today: LocalDate): StudyStats {
  return {
    streakDays: computeStreak(facts.activeDates, today),
    xpTotal: facts.xpTotal,
    chaptersCompleted: countCompleted(facts.chapters),
    chaptersTotal: facts.chapters.length,
    questionsAnswered: facts.questionsAnswered,
    correctAnswers: facts.correctAnswers,
    accuracy: accuracy(facts.correctAnswers, facts.questionsAnswered),
  };
}

export function buildDashboard(facts: LearnerFacts): Dashboard {
  const today = toLocalDate(facts.now, facts.preferences.timeZone);
  const stats = buildStats(facts, today);
  const minutes = Math.floor(facts.todayStudySeconds / 60);
  const goalMinutes = facts.preferences.dailyGoalMinutes;
  const cont = facts.subject ? continueStudying(facts.chapters, facts.subject.name) : null;

  return {
    displayName: facts.profile.displayName,
    gradeLevel: facts.profile.gradeLevel,
    subject: facts.subject,
    today: { date: today, minutes, goalMinutes, goalMet: minutes >= goalMinutes },
    stats,
    week: buildWeek(facts.activeDates, today),
    continueStudying: cont,
    nextReminder: nextReminder(facts.reminders, facts.now),
    recommendations: recommend({
      chapters: facts.chapters,
      chapterAccuracy: facts.chapterAccuracy,
      continueChapterId: cont?.chapter.id ?? null,
      streakDays: stats.streakDays,
      studiedToday: facts.activeDates.includes(today),
    }),
    isDemo: facts.isDemo,
  };
}

export function buildProgressSummary(facts: LearnerFacts): ProgressSummary {
  const today = toLocalDate(facts.now, facts.preferences.timeZone);
  return {
    stats: buildStats(facts, today),
    week: buildWeek(facts.activeDates, today),
    chapters: facts.chapters,
    achievements: facts.achievementCatalog.map((a) => ({
      ...a,
      earned: a.slug in facts.earnedAchievements,
      earnedAt: facts.earnedAchievements[a.slug] ?? null,
    })),
    isDemo: facts.isDemo,
  };
}

import type { LocalDate, XpReason } from '@matriq/types';
import { addDays } from './dates';

/**
 * XP rewards. Mirrored by `public.xp_for_reason()` in the database (the
 * authority for signed-in students); supabase/tests asserts they match.
 *
 * Only meaningful learning earns XP. Watching videos does not.
 */
export const XP_RULES = {
  correct_answer: 10,
  lesson_read: 10,
  chapter_completed: 50,
  revision_success: 5,
  daily_goal_met: 20,
  achievement: 0,
} as const satisfies Record<XpReason, number>;

/** Fraction of chapter questions needed to complete a chapter. */
export const PASS_RATIO = 2 / 3;

export function passMark(total: number): number {
  return Math.ceil(total * PASS_RATIO);
}

export function hasPassed(correct: number, total: number): boolean {
  return total > 0 && correct >= passMark(total);
}

/** Percentage of correct answers, or null when nothing has been answered. */
export function accuracy(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((Math.min(correct, total) / total) * 100);
}

/**
 * Consecutive active days ending today. If today has no activity yet, the
 * streak still counts up to yesterday, so a student is never shown a broken
 * streak before they have had the chance to study today.
 */
export function computeStreak(activeDates: Iterable<LocalDate>, today: LocalDate): number {
  const days = new Set(activeDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The seven days ending today, for the week strip on progress screens. */
export function buildWeek(activeDates: Iterable<LocalDate>, today: LocalDate) {
  const days = new Set(activeDates);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, active: days.has(date), isToday: date === today };
  });
}

export interface AchievementDefinition {
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  metric: 'chapters_completed' | 'streak_days' | 'correct_answers';
  threshold: number;
}

/** Achievement catalogue; seeded into `public.achievements`. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    slug: 'first-step',
    title: 'First step',
    description: 'You finished your first chapter.',
    iconKey: 'leaf',
    metric: 'chapters_completed',
    threshold: 1,
  },
  {
    slug: 'three-chapters',
    title: 'Three chapters',
    description: 'You finished three chapters.',
    iconKey: 'layers',
    metric: 'chapters_completed',
    threshold: 3,
  },
  {
    slug: 'seven-days',
    title: 'Seven days',
    description: 'You studied seven days in a row.',
    iconKey: 'flame',
    metric: 'streak_days',
    threshold: 7,
  },
];

export interface AchievementMetrics {
  chaptersCompleted: number;
  streakDays: number;
  correctAnswers: number;
}

const METRIC_KEY = {
  chapters_completed: 'chaptersCompleted',
  streak_days: 'streakDays',
  correct_answers: 'correctAnswers',
} as const;

/** Slugs of every achievement the metrics qualify for. */
export function qualifyingAchievements(metrics: AchievementMetrics): string[] {
  return ACHIEVEMENTS.filter((a) => metrics[METRIC_KEY[a.metric]] >= a.threshold).map(
    (a) => a.slug,
  );
}

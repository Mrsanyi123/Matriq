/**
 * Shared enum values and primitive domain types.
 *
 * These arrays are the single source of truth for enum-like values. The SQL
 * enums in supabase/migrations mirror them, and supabase/tests checks that the
 * two stay in sync.
 */

export const INTERFACE_LANGUAGES = ['en', 'am', 'om'] as const;
export type InterfaceLanguage = (typeof INTERFACE_LANGUAGES)[number];

export const GRADE_LEVELS = [9, 10, 11, 12] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

/** Grades where students choose a study stream. */
export const STREAM_GRADE_LEVELS = [11, 12] as const satisfies readonly GradeLevel[];

export const STREAMS = ['natural_science', 'social_science'] as const;
export type Stream = (typeof STREAMS)[number];

export const TARGET_EXAMS = ['euee', 'school_exams', 'general_study'] as const;
export type TargetExam = (typeof TARGET_EXAMS)[number];

export const DAILY_GOAL_MINUTES = [10, 20, 30, 45, 60] as const;
export type DailyGoalMinutes = (typeof DAILY_GOAL_MINUTES)[number];

export const EXPLANATION_STYLES = ['simple', 'step_by_step', 'exam_focused'] as const;
export type ExplanationStyle = (typeof EXPLANATION_STYLES)[number];

export const APP_ROLES = ['student', 'reviewer', 'editor', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const CONTENT_STATUSES = ['draft', 'in_review', 'approved', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/**
 * Where a question came from. Official past-exam questions and AI-generated
 * practice must never be mixed up; the database enforces the distinction.
 */
export const QUESTION_ORIGINS = ['official_past_exam', 'original_practice', 'ai_generated'] as const;
export type QuestionOrigin = (typeof QUESTION_ORIGINS)[number];

export const QUESTION_TYPES = ['multiple_choice'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const PRACTICE_MODES = [
  'chapter',
  'subject',
  'exam_year',
  'mixed',
  'mock_exam',
  'incorrect_review',
  'saved',
] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const CHAPTER_STATUSES = ['not_started', 'reading', 'practising', 'completed'] as const;
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];

export const LESSON_KINDS = ['full', 'quick_notes'] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const LESSON_SECTION_KINDS = [
  'text',
  'key_point',
  'worked_example',
  'formula',
  'diagram',
] as const;
export type LessonSectionKind = (typeof LESSON_SECTION_KINDS)[number];

export const REVISION_CARD_KINDS = [
  'concept',
  'formula',
  'worked_example',
  'true_false',
  'flashcard',
  'multiple_choice',
] as const;
export type RevisionCardKind = (typeof REVISION_CARD_KINDS)[number];

export const BOOKMARK_TARGETS = ['question', 'video', 'topic', 'revision_card', 'lesson'] as const;
export type BookmarkTarget = (typeof BOOKMARK_TARGETS)[number];

export const XP_REASONS = [
  'correct_answer',
  'lesson_read',
  'chapter_completed',
  'revision_success',
  'daily_goal_met',
  'achievement',
] as const;
export type XpReason = (typeof XP_REASONS)[number];

/** Default time zone for Ethiopian students (UTC+3, no daylight saving). */
export const DEFAULT_TIME_ZONE = 'Africa/Addis_Ababa';

/** ISO calendar date in the student's local time zone, e.g. `2026-10-29`. */
export type LocalDate = string;

/**
 * Pure mapping from Matriq RPC payloads (supabase/migrations/…_learning_functions.sql)
 * to the shared contract. Kept free of network code so the database tests
 * can run real RPC output through exactly the same mapping.
 */
import { deriveChapterStatus, currentChapter, type LearnerFacts } from '@matriq/core';
import { z } from 'zod';
import {
  ChapterDetailSchema,
  ChapterLinkSchema,
  IdSchema,
  LessonSectionSchema,
  LocalDateSchema,
  PreferencesSchema,
  ProfileSchema,
  ReminderSchema,
  SlugSchema,
  type ChapterDetail,
  type ChapterNode,
  type CoursePath,
} from '@matriq/validation';
import type { GradeLevel } from '@matriq/types';

export const AccountPayloadSchema = z.object({
  profile: ProfileSchema,
  preferences: PreferencesSchema,
});
export type AccountPayload = z.infer<typeof AccountPayloadSchema>;

const SubjectSummarySchema = z.object({ slug: SlugSchema, name: z.string(), iconKey: z.string() });

const RawChapterSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  number: z.number().int().positive(),
  title: z.string(),
  tagline: z.string(),
  unitTitle: z.string(),
  lessonRead: z.boolean(),
  practised: z.boolean(),
  completed: z.boolean(),
  bestScore: z.number().int().min(0).max(100).nullable(),
  questionCount: z.number().int().nonnegative(),
});

export const LearnerFactsPayloadSchema = AccountPayloadSchema.extend({
  subject: SubjectSummarySchema.nullable(),
  course: z.object({ editionName: z.string(), isDemo: z.boolean() }).nullable(),
  chapters: z.array(RawChapterSchema),
  today: LocalDateSchema,
  activeDates: z.array(LocalDateSchema),
  todayStudySeconds: z.number().int().nonnegative(),
  xpTotal: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  chapterAccuracy: z.record(
    z.string(),
    z.object({ attempts: z.number().int(), correct: z.number().int() }),
  ),
  reminders: z.array(ReminderSchema),
  earnedAchievements: z.record(z.string(), z.string()),
  achievementCatalog: z.array(
    z.object({ slug: SlugSchema, title: z.string(), description: z.string(), iconKey: z.string() }),
  ),
});
export type LearnerFactsPayload = z.infer<typeof LearnerFactsPayloadSchema>;

/** Postgres timestamps (`2026-10-29T13:52:01.18474+00:00`) → ISO 8601 with Z. */
export function toIsoInstant(value: string): string {
  return new Date(value).toISOString();
}

export function toChapterNodes(payload: LearnerFactsPayload): ChapterNode[] {
  return payload.chapters.map((c) => ({
    id: c.id,
    slug: c.slug,
    number: c.number,
    title: c.title,
    tagline: c.tagline,
    unitTitle: c.unitTitle,
    status: deriveChapterStatus(c),
    questionCount: c.questionCount,
    bestScore: c.bestScore,
  }));
}

export function toLearnerFacts(payload: LearnerFactsPayload, now: Date): LearnerFacts {
  const earned: Record<string, string> = {};
  for (const [slug, at] of Object.entries(payload.earnedAchievements)) earned[slug] = toIsoInstant(at);
  return {
    now,
    profile: payload.profile,
    preferences: payload.preferences,
    subject: payload.subject,
    chapters: payload.course ? toChapterNodes(payload) : [],
    activeDates: payload.activeDates,
    todayStudySeconds: payload.todayStudySeconds,
    xpTotal: payload.xpTotal,
    questionsAnswered: payload.questionsAnswered,
    correctAnswers: payload.correctAnswers,
    chapterAccuracy: payload.chapterAccuracy,
    reminders: payload.reminders,
    earnedAchievements: earned,
    achievementCatalog: payload.achievementCatalog,
    isDemo: payload.course?.isDemo ?? false,
  };
}

export function toCoursePath(payload: LearnerFactsPayload): CoursePath | null {
  if (!payload.course || !payload.subject || payload.profile.gradeLevel === null) return null;
  const chapters = toChapterNodes(payload);
  return {
    subject: payload.subject,
    gradeLevel: payload.profile.gradeLevel as GradeLevel,
    editionName: payload.course.editionName,
    isDemo: payload.course.isDemo,
    chapters,
    completedCount: chapters.filter((c) => c.status === 'completed').length,
    currentChapterId: currentChapter(chapters)?.id ?? null,
  };
}

export const ChapterPayloadSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  number: z.number().int().positive(),
  title: z.string(),
  tagline: z.string(),
  unitTitle: z.string(),
  subjectSlug: SlugSchema,
  objectives: z.array(z.string()),
  fullLesson: z.array(LessonSectionSchema),
  quickNotes: z.array(LessonSectionSchema),
  progress: z
    .object({ lessonRead: z.boolean(), practised: z.boolean(), completed: z.boolean() })
    .nullable(),
  questionCount: z.number().int().nonnegative(),
  previous: ChapterLinkSchema.nullable(),
  next: ChapterLinkSchema.nullable(),
  isDemo: z.boolean(),
});

export function toChapterDetail(payload: z.infer<typeof ChapterPayloadSchema>): ChapterDetail {
  const { progress, ...rest } = payload;
  return ChapterDetailSchema.parse({ ...rest, status: deriveChapterStatus(progress ?? undefined) });
}

/** Normalises achievement timestamps inside an RPC result. */
export function normaliseAchievements<T extends { newAchievements: { earnedAt: string | null }[] }>(
  value: T,
): T {
  return {
    ...value,
    newAchievements: value.newAchievements.map((a) => ({
      ...a,
      earnedAt: a.earnedAt ? toIsoInstant(a.earnedAt) : null,
    })),
  };
}

/** Map a raw study_reminders row (with joined subject) to the contract. */
export function toReminder(row: {
  id: string;
  title: string;
  days_of_week: number[];
  local_time: string;
  time_zone: string;
  enabled: boolean;
  subjects: { slug: string } | null;
}) {
  return ReminderSchema.parse({
    id: row.id,
    title: row.title,
    subjectSlug: row.subjects?.slug ?? null,
    daysOfWeek: row.days_of_week,
    localTime: row.local_time.slice(0, 5),
    timeZone: row.time_zone,
    enabled: row.enabled,
  });
}

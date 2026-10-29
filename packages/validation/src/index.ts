/**
 * Typed API contracts shared by web, mobile, the Supabase data layer and demo
 * mode. Every response crossing a network or storage boundary is parsed with
 * these schemas, so the inferred types are the source of truth for app code.
 */
import { z } from 'zod';
import {
  APP_ROLES,
  CHAPTER_STATUSES,
  DAILY_GOAL_MINUTES,
  EXPLANATION_STYLES,
  GRADE_LEVELS,
  INTERFACE_LANGUAGES,
  LESSON_SECTION_KINDS,
  QUESTION_ORIGINS,
  STREAMS,
  STREAM_GRADE_LEVELS,
  TARGET_EXAMS,
} from '@matriq/types';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const IdSchema = z.uuid();
export const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');
export const LocalDateSchema = z.iso.date();
export const DateTimeSchema = z.iso.datetime({ offset: true });
export const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

export const InterfaceLanguageSchema = z.enum(INTERFACE_LANGUAGES);
export const GradeLevelSchema = z.union(GRADE_LEVELS.map((g) => z.literal(g)));
export const StreamSchema = z.enum(STREAMS);
export const TargetExamSchema = z.enum(TARGET_EXAMS);
export const DailyGoalMinutesSchema = z.union(DAILY_GOAL_MINUTES.map((m) => z.literal(m)));
export const ExplanationStyleSchema = z.enum(EXPLANATION_STYLES);
export const AppRoleSchema = z.enum(APP_ROLES);
export const ChapterStatusSchema = z.enum(CHAPTER_STATUSES);
export const QuestionOriginSchema = z.enum(QUESTION_ORIGINS);
export const LessonSectionKindSchema = z.enum(LESSON_SECTION_KINDS);

export const TimeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown time zone');

// ---------------------------------------------------------------------------
// Profile, preferences and onboarding
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  id: IdSchema,
  displayName: z.string().nullable(),
  role: AppRoleSchema,
  isAnonymous: z.boolean(),
  onboarded: z.boolean(),
  gradeLevel: GradeLevelSchema.nullable(),
  stream: StreamSchema.nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PreferencesSchema = z.object({
  interfaceLanguage: InterfaceLanguageSchema,
  dailyGoalMinutes: DailyGoalMinutesSchema,
  targetExam: TargetExamSchema,
  explanationStyle: ExplanationStyleSchema,
  timeZone: TimeZoneSchema,
  subjectSlugs: z.array(SlugSchema),
  activeSubjectSlug: SlugSchema.nullable(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const UpdatePreferencesInputSchema = PreferencesSchema.partial();
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesInputSchema>;

export const DisplayNameSchema = z.string().trim().min(1).max(40);

export const OnboardingInputSchema = z
  .object({
    displayName: DisplayNameSchema.optional(),
    gradeLevel: GradeLevelSchema,
    stream: StreamSchema.nullable(),
    subjectSlugs: z.array(SlugSchema).min(1, 'Choose at least one subject').max(12),
    targetExam: TargetExamSchema,
    interfaceLanguage: InterfaceLanguageSchema,
    dailyGoalMinutes: DailyGoalMinutesSchema,
    timeZone: TimeZoneSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const needsStream = (STREAM_GRADE_LEVELS as readonly number[]).includes(value.gradeLevel);
    if (needsStream && value.stream === null) {
      ctx.addIssue({ code: 'custom', path: ['stream'], message: 'Choose your stream' });
    }
    if (!needsStream && value.stream !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['stream'],
        message: 'Streams start in grade 11',
      });
    }
  });
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const SubjectOptionSchema = z.object({
  slug: SlugSchema,
  name: z.string(),
  iconKey: z.string(),
  gradeLevels: z.array(GradeLevelSchema),
  /** Empty means the subject is common to every stream. */
  streams: z.array(StreamSchema),
  /** False while no published chapters exist yet ("coming soon"). */
  hasContent: z.boolean(),
});
export type SubjectOption = z.infer<typeof SubjectOptionSchema>;

export const OnboardingOptionsSchema = z.object({
  gradeLevels: z.array(GradeLevelSchema),
  streams: z.array(z.object({ slug: StreamSchema, name: z.string() })),
  subjects: z.array(SubjectOptionSchema),
  targetExams: z.array(z.object({ slug: TargetExamSchema, name: z.string() })),
});
export type OnboardingOptions = z.infer<typeof OnboardingOptionsSchema>;

/**
 * Subjects visible to a student, given their grade and stream. Stream
 * restrictions only apply once a student has a stream (grades 11–12).
 */
export function subjectsForStudent(
  subjects: readonly SubjectOption[],
  gradeLevel: number,
  stream: string | null,
): SubjectOption[] {
  return subjects.filter(
    (s) =>
      (s.gradeLevels as number[]).includes(gradeLevel) &&
      (s.streams.length === 0 || stream === null || (s.streams as string[]).includes(stream)),
  );
}

// ---------------------------------------------------------------------------
// Curriculum: course path and chapters
// ---------------------------------------------------------------------------

export const ChapterNodeSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  number: z.number().int().positive(),
  title: z.string(),
  tagline: z.string(),
  unitTitle: z.string(),
  status: ChapterStatusSchema,
  questionCount: z.number().int().nonnegative(),
  bestScore: z.number().int().min(0).max(100).nullable(),
});
export type ChapterNode = z.infer<typeof ChapterNodeSchema>;

export const CoursePathSchema = z.object({
  subject: z.object({ slug: SlugSchema, name: z.string(), iconKey: z.string() }),
  gradeLevel: GradeLevelSchema,
  editionName: z.string(),
  isDemo: z.boolean(),
  chapters: z.array(ChapterNodeSchema),
  completedCount: z.number().int().nonnegative(),
  /** The highlighted "current" node on the learning path, or null when all are done. */
  currentChapterId: IdSchema.nullable(),
});
export type CoursePath = z.infer<typeof CoursePathSchema>;

export const FunctionPlotDataSchema = z.object({
  type: z.literal('function_plot'),
  rule: z.string(),
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
  caption: z.string().optional(),
});
export type FunctionPlotData = z.infer<typeof FunctionPlotDataSchema>;

export const LessonSectionSchema = z.object({
  id: IdSchema,
  kind: LessonSectionKindSchema,
  heading: z.string().nullable(),
  body: z.string(),
  /** Structured payload for diagrams; null for plain text sections. */
  data: FunctionPlotDataSchema.nullable(),
});
export type LessonSection = z.infer<typeof LessonSectionSchema>;

export const ChapterLinkSchema = z.object({
  slug: SlugSchema,
  number: z.number().int().positive(),
  title: z.string(),
});
export type ChapterLink = z.infer<typeof ChapterLinkSchema>;

export const ChapterDetailSchema = z.object({
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
  status: ChapterStatusSchema,
  questionCount: z.number().int().nonnegative(),
  previous: ChapterLinkSchema.nullable(),
  next: ChapterLinkSchema.nullable(),
  isDemo: z.boolean(),
});
export type ChapterDetail = z.infer<typeof ChapterDetailSchema>;

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

/** A question as shown to students: no correct answer or explanation. */
export const PracticeQuestionSchema = z.object({
  id: IdSchema,
  prompt: z.string(),
  options: z
    .array(z.object({ id: IdSchema, label: z.string().max(2), body: z.string() }))
    .min(2),
  hints: z.array(z.string()),
  origin: QuestionOriginSchema,
  examYear: z.number().int().nullable(),
  isDemo: z.boolean(),
});
export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>;

export const PracticeSetSchema = z.object({
  sessionId: IdSchema,
  chapter: ChapterLinkSchema.extend({ id: IdSchema }),
  questions: z.array(PracticeQuestionSchema),
});
export type PracticeSet = z.infer<typeof PracticeSetSchema>;

export const SubmitAttemptInputSchema = z.object({
  sessionId: IdSchema,
  questionId: IdSchema,
  optionId: IdSchema,
  timeSpentMs: z.number().int().min(0).max(3_600_000).optional(),
});
export type SubmitAttemptInput = z.infer<typeof SubmitAttemptInputSchema>;

export const AttemptResultSchema = z.object({
  isCorrect: z.boolean(),
  correctOptionId: IdSchema,
  explanation: z.string(),
  xpAwarded: z.number().int().nonnegative(),
});
export type AttemptResult = z.infer<typeof AttemptResultSchema>;

export const AchievementSchema = z.object({
  slug: SlugSchema,
  title: z.string(),
  description: z.string(),
  iconKey: z.string(),
  earned: z.boolean(),
  earnedAt: DateTimeSchema.nullable(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const PracticeSessionResultSchema = z.object({
  sessionId: IdSchema,
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  passed: z.boolean(),
  xpAwarded: z.number().int().nonnegative(),
  chapterCompleted: z.boolean(),
  newAchievements: z.array(AchievementSchema),
});
export type PracticeSessionResult = z.infer<typeof PracticeSessionResultSchema>;

// ---------------------------------------------------------------------------
// Study time and reminders
// ---------------------------------------------------------------------------

export const RecordStudyTimeInputSchema = z.object({
  /** Active study time; capped per call to limit inflation. */
  seconds: z.number().int().min(1).max(1800),
  chapterId: IdSchema.optional(),
});
export type RecordStudyTimeInput = z.infer<typeof RecordStudyTimeInputSchema>;

export const ReminderSchema = z.object({
  id: IdSchema,
  title: z.string().min(1).max(60),
  subjectSlug: SlugSchema.nullable(),
  /** 0 = Sunday … 6 = Saturday, in the reminder's time zone. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  localTime: LocalTimeSchema,
  timeZone: TimeZoneSchema,
  enabled: z.boolean(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

export const CreateReminderInputSchema = ReminderSchema.omit({ id: true, enabled: true });
export type CreateReminderInput = z.infer<typeof CreateReminderInputSchema>;

// ---------------------------------------------------------------------------
// Dashboard and progress
// ---------------------------------------------------------------------------

export const WeekDaySchema = z.object({
  date: LocalDateSchema,
  active: z.boolean(),
  isToday: z.boolean(),
});
export type WeekDay = z.infer<typeof WeekDaySchema>;

export const StudyStatsSchema = z.object({
  streakDays: z.number().int().nonnegative(),
  xpTotal: z.number().int().nonnegative(),
  chaptersCompleted: z.number().int().nonnegative(),
  chaptersTotal: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  /** Percentage 0–100, or null before any answers. */
  accuracy: z.number().int().min(0).max(100).nullable(),
});
export type StudyStats = z.infer<typeof StudyStatsSchema>;

export const ContinueStudyingSchema = z.object({
  chapter: ChapterLinkSchema.extend({ id: IdSchema }),
  subjectName: z.string(),
  status: ChapterStatusSchema,
  /** What the primary button should do next. */
  action: z.enum(['read', 'practice', 'review']),
});
export type ContinueStudying = z.infer<typeof ContinueStudyingSchema>;

export const RecommendationSchema = z.object({
  id: z.string(),
  kind: z.enum(['start_chapter', 'practice_chapter', 'revisit_weak_chapter', 'keep_streak']),
  chapter: ChapterLinkSchema.nullable(),
  /** An @matriq/i18n message key; apps translate it and interpolate the chapter title as {title}. */
  messageKey: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const UpcomingReminderSchema = z.object({
  id: IdSchema,
  title: z.string(),
  subjectSlug: SlugSchema.nullable(),
  nextAt: DateTimeSchema,
});
export type UpcomingReminder = z.infer<typeof UpcomingReminderSchema>;

export const DashboardSchema = z.object({
  displayName: z.string().nullable(),
  gradeLevel: GradeLevelSchema.nullable(),
  subject: z.object({ slug: SlugSchema, name: z.string(), iconKey: z.string() }).nullable(),
  today: z.object({
    date: LocalDateSchema,
    minutes: z.number().int().nonnegative(),
    goalMinutes: DailyGoalMinutesSchema,
    goalMet: z.boolean(),
  }),
  stats: StudyStatsSchema,
  week: z.array(WeekDaySchema).length(7),
  continueStudying: ContinueStudyingSchema.nullable(),
  nextReminder: UpcomingReminderSchema.nullable(),
  recommendations: z.array(RecommendationSchema).max(2),
  isDemo: z.boolean(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const ProgressSummarySchema = z.object({
  stats: StudyStatsSchema,
  week: z.array(WeekDaySchema).length(7),
  chapters: z.array(ChapterNodeSchema),
  achievements: z.array(AchievementSchema),
  isDemo: z.boolean(),
});
export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;

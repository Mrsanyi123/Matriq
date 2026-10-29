import type {
  AttemptResult,
  ChapterDetail,
  CoursePath,
  CreateReminderInput,
  Dashboard,
  GradeLevel,
  OnboardingInput,
  OnboardingOptions,
  PracticeSessionResult,
  PracticeSet,
  Preferences,
  Profile,
  ProgressSummary,
  RecordStudyTimeInput,
  Reminder,
  Stream,
  SubmitAttemptInput,
  UpdatePreferencesInput,
} from './contract-types';

export interface UpdateProfileInput {
  displayName?: string | null;
  gradeLevel?: GradeLevel;
  stream?: Stream | null;
}

/**
 * The data contract shared by web and mobile. Two implementations exist:
 *
 * - `createSupabaseApi(client)`: production. Supabase Auth + Postgres with
 *   Row Level Security; answers are checked server-side.
 * - `createDemoApi(storage)`: the guest demo. Bundled demo content, progress
 *   saved on the device only, always labelled "Demo" in the UI.
 *
 * Every method resolves to data validated against @matriq/validation, or
 * rejects with a `MatriqApiError`.
 */
export interface MatriqApi {
  readonly mode: 'supabase' | 'demo';

  getProfile(): Promise<Profile>;
  updateProfile(input: UpdateProfileInput): Promise<Profile>;
  getPreferences(): Promise<Preferences>;
  updatePreferences(input: UpdatePreferencesInput): Promise<Preferences>;

  getOnboardingOptions(): Promise<OnboardingOptions>;
  completeOnboarding(input: OnboardingInput): Promise<void>;

  getDashboard(): Promise<Dashboard>;
  getProgress(): Promise<ProgressSummary>;

  /**
   * The learning path for a subject at the student's grade (defaults to the
   * active subject). Resolves to null when no published chapters exist yet.
   */
  getCoursePath(subjectSlug?: string): Promise<CoursePath | null>;
  /** Rejects with code `not_found` for unknown or unpublished chapters. */
  getChapter(slug: string): Promise<ChapterDetail>;
  markLessonRead(chapterId: string): Promise<{ xpAwarded: number }>;

  startChapterPractice(chapterId: string): Promise<PracticeSet>;
  submitAttempt(input: SubmitAttemptInput): Promise<AttemptResult>;
  completePracticeSession(sessionId: string): Promise<PracticeSessionResult>;

  recordStudyTime(input: RecordStudyTimeInput): Promise<void>;

  listReminders(): Promise<Reminder[]>;
  createReminder(input: CreateReminderInput): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
}

export type MatriqApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'network'
  | 'not_configured'
  | 'unknown';

export class MatriqApiError extends Error {
  readonly code: MatriqApiErrorCode;
  override readonly cause: unknown;

  constructor(code: MatriqApiErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'MatriqApiError';
    this.code = code;
    this.cause = cause;
  }
}

export function isMatriqApiError(error: unknown): error is MatriqApiError {
  return error instanceof MatriqApiError;
}

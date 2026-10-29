import {
  STREAM_GRADE_LEVELS,
  type DailyGoalMinutes,
  type GradeLevel,
  type InterfaceLanguage,
  type Stream,
  type TargetExam,
} from '@matriq/types';
import {
  DisplayNameSchema,
  OnboardingInputSchema,
  subjectsForStudent,
  type OnboardingInput,
  type SubjectOption,
} from '@matriq/validation';
import type { ExtraMessageKey } from './i18n-extra';

export type OnboardingStep = 'grade' | 'stream' | 'subjects' | 'exam' | 'language' | 'goal' | 'name';

export interface OnboardingDraft {
  gradeLevel: GradeLevel | null;
  stream: Stream | null;
  subjectSlugs: string[];
  targetExam: TargetExam;
  interfaceLanguage: InterfaceLanguage;
  dailyGoalMinutes: DailyGoalMinutes;
  displayName: string;
}

export function needsStream(grade: number | null): boolean {
  return grade !== null && (STREAM_GRADE_LEVELS as readonly number[]).includes(grade);
}

/** Steps for the current draft; "stream" only appears for grades 11–12. */
export function onboardingSteps(grade: number | null): OnboardingStep[] {
  return ['grade', ...(needsStream(grade) ? (['stream'] as const) : []), 'subjects', 'exam', 'language', 'goal', 'name'];
}

/** Subjects offered for the draft's grade and stream. */
export function visibleSubjects(subjects: readonly SubjectOption[], draft: OnboardingDraft): SubjectOption[] {
  if (draft.gradeLevel === null) return [];
  return subjectsForStudent(subjects, draft.gradeLevel, needsStream(draft.gradeLevel) ? draft.stream : null);
}

/** Validation message for a step, or null when the student may continue. */
export function stepError(
  step: OnboardingStep,
  draft: OnboardingDraft,
  subjects: readonly SubjectOption[],
): ExtraMessageKey | null {
  switch (step) {
    case 'grade':
      return draft.gradeLevel === null ? 'onboarding.gradeRequired' : null;
    case 'stream':
      return needsStream(draft.gradeLevel) && draft.stream === null ? 'onboarding.streamRequired' : null;
    case 'subjects': {
      const visible = new Set(visibleSubjects(subjects, draft).map((s) => s.slug));
      return draft.subjectSlugs.some((s) => visible.has(s)) ? null : 'onboarding.subjectsRequired';
    }
    case 'name':
      return draft.displayName.trim() === '' || DisplayNameSchema.safeParse(draft.displayName).success
        ? null
        : 'onboarding.nameInvalid';
    default:
      return null;
  }
}

/** Builds and validates the `completeOnboarding` payload. */
export function toOnboardingInput(
  draft: OnboardingDraft,
  subjects: readonly SubjectOption[],
  timeZone?: string,
): ReturnType<typeof OnboardingInputSchema.safeParse> {
  const visible = new Set(visibleSubjects(subjects, draft).map((s) => s.slug));
  const name = draft.displayName.trim();
  const input: Partial<OnboardingInput> & Record<string, unknown> = {
    gradeLevel: draft.gradeLevel ?? undefined,
    stream: needsStream(draft.gradeLevel) ? draft.stream : null,
    subjectSlugs: draft.subjectSlugs.filter((s) => visible.has(s)),
    targetExam: draft.targetExam,
    interfaceLanguage: draft.interfaceLanguage,
    dailyGoalMinutes: draft.dailyGoalMinutes,
    ...(name ? { displayName: name } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
  return OnboardingInputSchema.safeParse(input);
}

/** The browser's IANA time zone, if it is one the API accepts. */
export function browserTimeZone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

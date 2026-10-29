import { DEFAULT_TIME_ZONE, STREAM_GRADE_LEVELS, type DailyGoalMinutes, type GradeLevel, type InterfaceLanguage, type Stream, type TargetExam } from '@matriq/types';
import { OnboardingInputSchema, type OnboardingInput } from '@matriq/validation';

export type OnboardingStep = 'grade' | 'stream' | 'subjects' | 'exam' | 'language' | 'goal' | 'name';

export interface OnboardingDraft {
  gradeLevel: GradeLevel | null;
  stream: Stream | null;
  subjectSlugs: string[];
  targetExam: TargetExam | null;
  interfaceLanguage: InterfaceLanguage;
  dailyGoalMinutes: DailyGoalMinutes | null;
  displayName: string;
}

export function needsStream(grade: number | null): boolean {
  return grade !== null && (STREAM_GRADE_LEVELS as readonly number[]).includes(grade);
}

/** Steps for the current draft; the stream step only exists for grades 11–12. */
export function stepsFor(draft: Pick<OnboardingDraft, 'gradeLevel'>): OnboardingStep[] {
  return needsStream(draft.gradeLevel)
    ? ['grade', 'stream', 'subjects', 'exam', 'language', 'goal', 'name']
    : ['grade', 'subjects', 'exam', 'language', 'goal', 'name'];
}

/** Whether the learner can move past `step`. */
export function stepComplete(step: OnboardingStep, draft: OnboardingDraft): boolean {
  switch (step) {
    case 'grade':
      return draft.gradeLevel !== null;
    case 'stream':
      return draft.stream !== null;
    case 'subjects':
      return draft.subjectSlugs.length > 0;
    case 'exam':
      return draft.targetExam !== null;
    case 'goal':
      return draft.dailyGoalMinutes !== null;
    default:
      return true;
  }
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Validates the draft with the shared `OnboardingInputSchema`. */
export function buildOnboardingInput(
  draft: OnboardingDraft,
  timeZone: string = deviceTimeZone(),
): { ok: true; input: OnboardingInput } | { ok: false; issues: string[] } {
  const name = draft.displayName.trim();
  const candidate = {
    gradeLevel: draft.gradeLevel,
    stream: needsStream(draft.gradeLevel) ? draft.stream : null,
    subjectSlugs: draft.subjectSlugs,
    targetExam: draft.targetExam,
    interfaceLanguage: draft.interfaceLanguage,
    dailyGoalMinutes: draft.dailyGoalMinutes,
    ...(name ? { displayName: name } : {}),
    timeZone,
  };
  let result = OnboardingInputSchema.safeParse(candidate);
  if (!result.success && result.error.issues.some((i) => i.path[0] === 'timeZone')) {
    // Unknown device zone: fall back to Ethiopia's.
    result = OnboardingInputSchema.safeParse({ ...candidate, timeZone: DEFAULT_TIME_ZONE });
  }
  if (result.success) return { ok: true, input: result.data };
  return { ok: false, issues: result.error.issues.map((i) => i.path.join('.') || i.message) };
}

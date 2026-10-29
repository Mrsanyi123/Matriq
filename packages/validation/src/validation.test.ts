import { describe, expect, it } from 'vitest';
import { OnboardingInputSchema, subjectsForStudent, type SubjectOption } from './index';

const base = {
  gradeLevel: 12,
  stream: 'natural_science',
  subjectSlugs: ['mathematics'],
  targetExam: 'euee',
  interfaceLanguage: 'am',
  dailyGoalMinutes: 20,
} as const;

describe('OnboardingInputSchema', () => {
  it('accepts a complete grade 12 profile', () => {
    expect(OnboardingInputSchema.safeParse(base).success).toBe(true);
  });

  it('requires a stream in grades 11 and 12', () => {
    const result = OnboardingInputSchema.safeParse({ ...base, stream: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['stream']);
  });

  it('rejects a stream before grade 11', () => {
    expect(OnboardingInputSchema.safeParse({ ...base, gradeLevel: 9 }).success).toBe(false);
    expect(OnboardingInputSchema.safeParse({ ...base, gradeLevel: 9, stream: null }).success).toBe(
      true,
    );
  });

  it('rejects unsupported languages and goals', () => {
    expect(OnboardingInputSchema.safeParse({ ...base, interfaceLanguage: 'fr' }).success).toBe(false);
    expect(OnboardingInputSchema.safeParse({ ...base, dailyGoalMinutes: 7 }).success).toBe(false);
  });

  it('requires at least one subject', () => {
    expect(OnboardingInputSchema.safeParse({ ...base, subjectSlugs: [] }).success).toBe(false);
  });
});

describe('subjectsForStudent', () => {
  const subjects: SubjectOption[] = [
    { slug: 'mathematics', name: 'Mathematics', iconKey: 'function', gradeLevels: [9, 10, 11, 12], streams: [], hasContent: true },
    { slug: 'physics', name: 'Physics', iconKey: 'zap', gradeLevels: [9, 10, 11, 12], streams: ['natural_science'], hasContent: false },
    { slug: 'history', name: 'History', iconKey: 'landmark', gradeLevels: [9, 10, 11, 12], streams: ['social_science'], hasContent: false },
  ];

  it('filters by stream in grades 11–12', () => {
    expect(subjectsForStudent(subjects, 12, 'natural_science').map((s) => s.slug)).toEqual([
      'mathematics',
      'physics',
    ]);
  });

  it('shows every grade subject before streams begin', () => {
    expect(subjectsForStudent(subjects, 9, null)).toHaveLength(3);
  });
});

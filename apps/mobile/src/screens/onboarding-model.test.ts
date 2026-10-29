import { buildOnboardingInput, stepComplete, stepsFor, type OnboardingDraft } from './onboarding-model';

const draft: OnboardingDraft = {
  gradeLevel: 12,
  stream: 'natural_science',
  subjectSlugs: ['mathematics'],
  targetExam: 'euee',
  interfaceLanguage: 'am',
  dailyGoalMinutes: 30,
  displayName: '  Selam ',
};

describe('onboarding model', () => {
  it('asks for a stream only in grades 11 and 12', () => {
    expect(stepsFor({ gradeLevel: 12 })).toContain('stream');
    expect(stepsFor({ gradeLevel: 11 })).toContain('stream');
    expect(stepsFor({ gradeLevel: 10 })).not.toContain('stream');
    expect(stepsFor({ gradeLevel: null })).toHaveLength(6);
  });

  it('blocks moving on until each required step is answered', () => {
    expect(stepComplete('grade', { ...draft, gradeLevel: null })).toBe(false);
    expect(stepComplete('stream', { ...draft, stream: null })).toBe(false);
    expect(stepComplete('subjects', { ...draft, subjectSlugs: [] })).toBe(false);
    expect(stepComplete('exam', { ...draft, targetExam: null })).toBe(false);
    expect(stepComplete('name', { ...draft, displayName: '' })).toBe(true);
  });

  it('builds input that passes OnboardingInputSchema', () => {
    const result = buildOnboardingInput(draft, 'Africa/Addis_Ababa');
    expect(result).toEqual({
      ok: true,
      input: {
        gradeLevel: 12,
        stream: 'natural_science',
        subjectSlugs: ['mathematics'],
        targetExam: 'euee',
        interfaceLanguage: 'am',
        dailyGoalMinutes: 30,
        displayName: 'Selam',
        timeZone: 'Africa/Addis_Ababa',
      },
    });
  });

  it('omits an empty name and drops the stream below grade 11', () => {
    const result = buildOnboardingInput(
      { ...draft, gradeLevel: 10, stream: 'social_science', displayName: '   ' },
      'Africa/Addis_Ababa',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.stream).toBeNull();
      expect(result.input).not.toHaveProperty('displayName');
    }
  });

  it('rejects a grade 12 learner without a stream or subjects', () => {
    expect(buildOnboardingInput({ ...draft, stream: null }, 'Africa/Addis_Ababa')).toEqual({
      ok: false,
      issues: ['stream'],
    });
    const noSubjects = buildOnboardingInput({ ...draft, subjectSlugs: [] }, 'Africa/Addis_Ababa');
    expect(noSubjects.ok).toBe(false);
  });

  it('falls back to the Ethiopian time zone for an unknown device zone', () => {
    const result = buildOnboardingInput(draft, 'Mars/Olympus_Mons');
    expect(result.ok && result.input.timeZone).toBe('Africa/Addis_Ababa');
  });
});

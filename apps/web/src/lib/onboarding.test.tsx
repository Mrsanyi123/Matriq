import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OnboardingFlow } from '@/app/onboarding/onboarding-screen';
import { renderWithProviders, testDemoApi } from '@/test/render';
import { onboardingSteps, stepError, toOnboardingInput, type OnboardingDraft } from './onboarding';

const api = testDemoApi();
const options = await api.getOnboardingOptions();

const draft: OnboardingDraft = {
  gradeLevel: 12,
  stream: 'social_science',
  subjectSlugs: ['mathematics', 'physics'],
  targetExam: 'euee',
  interfaceLanguage: 'en',
  dailyGoalMinutes: 20,
  displayName: '',
};

describe('onboarding logic', () => {
  it('asks for a stream only in grades 11 and 12', () => {
    expect(onboardingSteps(10)).not.toContain('stream');
    expect(onboardingSteps(11)).toContain('stream');
    expect(onboardingSteps(12)).toEqual(['grade', 'stream', 'subjects', 'exam', 'language', 'goal', 'name']);
  });

  it('validates each step', () => {
    expect(stepError('grade', { ...draft, gradeLevel: null }, options.subjects)).toBe('onboarding.gradeRequired');
    expect(stepError('stream', { ...draft, stream: null }, options.subjects)).toBe('onboarding.streamRequired');
    expect(stepError('subjects', { ...draft, subjectSlugs: [] }, options.subjects)).toBe('onboarding.subjectsRequired');
    // Physics is natural-science only, so it does not count for a social-science student.
    expect(stepError('subjects', { ...draft, subjectSlugs: ['physics'] }, options.subjects)).toBe(
      'onboarding.subjectsRequired',
    );
    expect(stepError('name', { ...draft, displayName: 'x'.repeat(41) }, options.subjects)).toBe('onboarding.nameInvalid');
    expect(stepError('name', draft, options.subjects)).toBeNull();
  });

  it('builds a payload that passes OnboardingInputSchema', () => {
    const parsed = toOnboardingInput({ ...draft, displayName: '  Hana ' }, options.subjects, 'Africa/Addis_Ababa');
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      displayName: 'Hana',
      stream: 'social_science',
      subjectSlugs: ['mathematics'],
      timeZone: 'Africa/Addis_Ababa',
    });
  });

  it('drops the stream below grade 11', () => {
    const parsed = toOnboardingInput({ ...draft, gradeLevel: 10 }, options.subjects);
    expect(parsed.success && parsed.data.stream).toBeNull();
  });
});

describe('<OnboardingFlow>', () => {
  it('walks through every step and completes onboarding', async () => {
    const user = userEvent.setup();
    const demo = testDemoApi();
    const [profile, preferences] = await Promise.all([demo.getProfile(), demo.getPreferences()]);
    renderWithProviders(
      <OnboardingFlow api={demo} options={options} profile={{ ...profile, gradeLevel: null, stream: null }} preferences={preferences} />,
      { api: demo },
    );
    const next = () => user.click(screen.getByTestId('onboarding-next'));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which grade are you in?');
    await next();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose your grade.');
    await user.click(screen.getByRole('radio', { name: 'Grade 11' }));
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
    await next();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which stream are you in?');
    await next();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose your stream.');
    await user.click(screen.getByRole('radio', { name: 'Natural science' }));
    await next();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which subjects do you study?');
    expect(screen.getByRole('checkbox', { name: /Physics.*Coming soon/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /History/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Physics/ }));
    await next();

    await user.click(screen.getByRole('radio', { name: 'School exams' }));
    await next();
    await user.click(screen.getByRole('radio', { name: /አማርኛ/ }));
    // The interface switches immediately.
    await waitFor(() => expect(document.documentElement.lang).toBe('am'));
    expect(screen.getByText('የትምህርት ጽሑፉ በእንግሊዝኛ ይቆያል።')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /English/ }));
    await next();
    await user.click(screen.getByRole('radio', { name: '30 min' }));
    await next();
    await user.type(screen.getByRole('textbox'), 'Hana');
    await user.click(screen.getByRole('button', { name: /Start learning/ }));

    await waitFor(async () => expect((await demo.getProfile()).onboarded).toBe(true));
    expect(await demo.getProfile()).toMatchObject({ displayName: 'Hana', gradeLevel: 11, stream: 'natural_science' });
    expect(await demo.getPreferences()).toMatchObject({
      dailyGoalMinutes: 30,
      targetExam: 'school_exams',
      subjectSlugs: ['mathematics', 'physics'],
    });
  });
});

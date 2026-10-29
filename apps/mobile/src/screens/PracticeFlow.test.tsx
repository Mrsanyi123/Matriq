import { createDemoApi, createMemoryStorage } from '@matriq/api-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DEMO_CHOICE_KEY } from '../lib/session';
import { renderWithProviders } from '../test/render';
import { PracticeFlow } from './PracticeSessionScreen';

async function press(testId: string) {
  await fireEvent.press(await screen.findByTestId(testId));
}

describe('practice flow against the demo API', () => {
  it('answers a chapter, shows hints and feedback, and reports results', async () => {
    const storage = createMemoryStorage({ [DEMO_CHOICE_KEY]: '1' });
    const api = createDemoApi(storage);
    const path = await api.getCoursePath();
    const chapter = path!.chapters[0]!;
    const onBackToChapters = jest.fn();
    const onReview = jest.fn();

    await renderWithProviders(
      <PracticeFlow
        api={api}
        chapterId={chapter.id}
        onBack={() => {}}
        onBackToChapters={onBackToChapters}
        onReview={onReview}
      />,
      { storage },
    );

    // Question 1: f(x) = 3x + 2, f(2)? (C is correct)
    expect(await screen.findByText('If f(x) = 3x + 2, what is f(2)?')).toBeTruthy();
    expect(screen.getByTestId('question-meta').props.children).toBe('Question 1 / 3');
    expect(screen.getByTestId('check-button').props.accessibilityState.disabled).toBe(true);

    // Progressive static hints in the lavender AI card.
    await press('hint-button');
    expect(screen.getByText('AI help · Demo')).toBeTruthy();
    expect(screen.getByText(/^1\. Replace x with 2 in the rule\.$/)).toBeTruthy();
    expect(screen.queryByText(/Multiply 3 × 2/)).toBeNull();
    await press('next-hint');
    expect(screen.getByText(/^2\. Multiply 3 × 2 before adding 2\.$/)).toBeTruthy();
    expect(screen.queryByTestId('next-hint')).toBeNull();

    // Wrong answer: warm feedback, correct option revealed, options locked.
    await press('option-B');
    await press('check-button');
    expect(await screen.findByTestId('feedback-wrong')).toBeTruthy();
    expect(screen.getByText('Correct answer: C')).toBeTruthy();
    expect(screen.getByText('f(2) = 3(2) + 2 = 8.')).toBeTruthy();
    expect(screen.getByTestId('option-A').props.accessibilityState.disabled).toBe(true);

    // Question 2: (-3)² (D), question 3: domain (B).
    await press('next-button');
    expect(await screen.findByText('Question 2 / 3')).toBeTruthy();
    await press('option-D');
    await press('check-button');
    expect(await screen.findByTestId('feedback-correct')).toBeTruthy();
    expect(screen.getByText('Well done!')).toBeTruthy();
    await press('next-button');
    await press('option-B');
    await press('check-button');
    await screen.findByTestId('feedback-correct');
    expect(screen.getByText('See results')).toBeTruthy();
    await press('next-button');

    // 2/3 passes: 2 × 10 XP for answers + 50 for completing the chapter.
    expect(await screen.findByText('Chapter practice done!')).toBeTruthy();
    expect(screen.getByTestId('results-score').props.children).toBe('2/3');
    expect(screen.getByTestId('results-xp').props.children).toBe('+70');
    expect(screen.getByTestId('new-badge-first-step')).toBeTruthy();

    // Progress was saved through the API (fresh instance reads storage).
    const progress = await createDemoApi(storage).getProgress();
    expect(progress.chapters[0]!.status).toBe('completed');
    expect(progress.stats.questionsAnswered).toBe(3);

    await press('review-notes');
    expect(onReview).toHaveBeenCalledWith(chapter.slug);
    await press('back-to-chapters');
    expect(onBackToChapters).toHaveBeenCalled();

    // Try again starts a fresh session at question 1.
    await press('retry');
    await waitFor(() => expect(screen.getByText('Question 1 / 3')).toBeTruthy());
  });
});

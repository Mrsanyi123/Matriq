import { DEMO_CHAPTERS } from '@matriq/demo-content';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, testDemoApi } from '@/test/render';
import { AnswerOption, optionState } from './answer-option';
import { PracticeRunner } from './practice-runner';

const result = { correctOptionId: 'b' };

describe('optionState', () => {
  it('shows only the selection before checking', () => {
    expect(optionState('a', 'a', null)).toBe('selected');
    expect(optionState('b', 'a', null)).toBe('idle');
  });

  it('marks the correct answer right and a wrong choice wrong after checking', () => {
    expect(optionState('b', 'a', result)).toBe('right');
    expect(optionState('a', 'a', result)).toBe('wrong');
    expect(optionState('c', 'a', result)).toBe('idle');
    expect(optionState('b', 'b', result)).toBe('right');
  });
});

describe('<AnswerOption>', () => {
  it('exposes pressed and disabled states', async () => {
    const onSelect = vi.fn();
    const { rerender } = renderWithProviders(
      <AnswerOption label="A" body="5" state="idle" chosen={false} checked={false} onSelect={onSelect} />,
    );
    const button = screen.getByRole('button', { name: /5/ });
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute('aria-pressed', 'false');

    rerender(<AnswerOption label="A" body="5" state="right" chosen checked onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /5/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /5/ })).toHaveAttribute('data-option-state', 'right');
    expect(screen.getByText('Correct')).toBeInTheDocument();
  });
});

describe('<PracticeRunner>', () => {
  it('runs a session: hints, check, feedback, next, results', async () => {
    const user = userEvent.setup();
    const api = testDemoApi();
    const chapter = DEMO_CHAPTERS[0]!;
    const set = await api.startChapterPractice(chapter.id);
    renderWithProviders(<PracticeRunner set={set} onRestart={() => {}} />, { api });

    expect(screen.getByText('Question 1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check answer/ })).toBeDisabled();

    // Progressive, static hints in the AI card.
    await user.click(screen.getByRole('button', { name: /Give me a hint/ }));
    expect(screen.getByText('AI help · Demo')).toBeInTheDocument();
    expect(screen.getAllByTestId('hint')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Another hint/ }));
    expect(screen.getAllByTestId('hint')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Another hint/ })).not.toBeInTheDocument();

    for (const [i, q] of chapter.questions.entries()) {
      const correct = q.options.find((o) => o.isCorrect)!;
      // Answer the first question wrongly, the rest correctly.
      const pick = i === 0 ? q.options.find((o) => !o.isCorrect)! : correct;
      await user.click(screen.getByRole('button', { name: pick.body }));
      await user.click(screen.getByRole('button', { name: /Check answer/ }));
      const feedback = await screen.findByTestId('feedback');
      expect(feedback).toHaveTextContent(i === 0 ? 'Good try!' : 'Well done!');
      expect(feedback).toHaveTextContent(q.explanation);
      const rightButton = screen.getAllByRole('button').find((b) => b.getAttribute('data-option-state') === 'right');
      expect(rightButton).toHaveTextContent(correct.body);
      await user.click(screen.getByRole('button', { name: i === 2 ? /See results/ : /Next question/ }));
    }

    const results = await screen.findByTestId('results');
    expect(results).toHaveTextContent('Chapter practice done!');
    expect(screen.getByTestId('result-score')).toHaveTextContent('2/3');
    // 2 first-time correct answers (2 × 10) + chapter completed (50).
    expect(screen.getByTestId('result-xp')).toHaveTextContent('+70');
    expect(results).toHaveTextContent('First step');
    await waitFor(async () => expect((await api.getDashboard()).stats.chaptersCompleted).toBe(1));
  });
});

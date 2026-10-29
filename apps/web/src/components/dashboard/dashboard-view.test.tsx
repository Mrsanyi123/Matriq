import { DashboardSchema, type Dashboard } from '@matriq/validation';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { DashboardView } from './dashboard-view';

const fixture: Dashboard = DashboardSchema.parse({
  displayName: 'Hana',
  gradeLevel: 12,
  subject: { slug: 'mathematics', name: 'Mathematics', iconKey: 'function' },
  today: { date: '2026-10-29', minutes: 12, goalMinutes: 20, goalMet: false },
  stats: {
    streakDays: 3,
    xpTotal: 140,
    chaptersCompleted: 1,
    chaptersTotal: 3,
    questionsAnswered: 9,
    correctAnswers: 7,
    accuracy: 78,
  },
  week: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${String(23 + i).padStart(2, '0')}`,
    active: i > 3,
    isToday: i === 6,
  })),
  continueStudying: {
    chapter: { id: '00000000-0000-4000-8000-060000000002', slug: 'limits-and-continuity', number: 2, title: 'Limits & continuity' },
    subjectName: 'Mathematics',
    status: 'reading',
    action: 'practice',
  },
  nextReminder: null,
  recommendations: [
    { id: 'start:x', kind: 'start_chapter', chapter: { slug: 'derivatives', number: 3, title: 'Derivatives' }, messageKey: 'rec.startChapter' },
    { id: 'keep-streak', kind: 'keep_streak', chapter: null, messageKey: 'rec.keepStreak' },
  ],
  isDemo: true,
});

// 07:00 UTC is 10:00 in Addis Ababa.
const morning = new Date('2026-10-29T07:00:00Z');

describe('<DashboardView>', () => {
  it('renders greeting, one continue card, goal, stats and suggestions', () => {
    renderWithProviders(<DashboardView data={fixture} timeZone="Africa/Addis_Ababa" now={morning} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, Hana');
    expect(screen.getByText(/trying Matriq without an account/)).toBeInTheDocument();

    const card = screen.getByTestId('continue-card');
    expect(within(card).getByText('Limits & continuity')).toHaveAttribute('lang', 'en');
    expect(within(card).getByRole('link')).toHaveAttribute('href', '/learn/limits-and-continuity/practice');
    expect(within(card).getByRole('link')).toHaveTextContent('Practise this chapter');

    const goal = screen.getByTestId('daily-goal');
    expect(goal).toHaveTextContent('12 of 20 min');
    expect(goal).toHaveTextContent('8 min to go today');
    expect(within(goal).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');

    expect(screen.getByTestId('stat-streak')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-xp')).toHaveTextContent('140');
    expect(screen.getByTestId('stat-chapters')).toHaveTextContent('1/3');
    expect(screen.getByTestId('stat-accuracy')).toHaveTextContent('78%');

    expect(screen.getByRole('link', { name: /Ask AI/ })).toHaveAttribute('href', '/tutor');
    expect(screen.getByText('No study time planned yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Plan a study time/ })).toHaveAttribute('href', '/planner');
    expect(screen.getByText('Start “Derivatives” when you are ready.')).toBeInTheDocument();
    expect(screen.getByText('A few minutes today keeps your rhythm going.')).toBeInTheDocument();
  });

  it('greets without a name and shows the review action', () => {
    const data = {
      ...fixture,
      displayName: null,
      isDemo: false,
      continueStudying: { ...fixture.continueStudying!, action: 'review' as const, status: 'completed' as const },
    };
    renderWithProviders(<DashboardView data={data} timeZone="Africa/Addis_Ababa" now={morning} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back');
    expect(screen.queryByText(/without an account/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('continue-card')).getByRole('link')).toHaveTextContent('Review this chapter');
  });

  it('switches the whole interface to Amharic', () => {
    renderWithProviders(<DashboardView data={fixture} timeZone="Africa/Addis_Ababa" now={morning} />, { language: 'am' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ሰላም፣ Hana');
    expect(screen.getByTestId('daily-goal')).toHaveTextContent('12 / 20 ደቂቃ');
  });
});

import { fireEvent, screen } from '@testing-library/react-native';
import { dashboardFixture } from '../test/fixtures';
import { renderWithProviders, router } from '../test/render';
import { HomeContent } from './HomeScreen';

// 10:00 in Addis Ababa (UTC+3).
const morning = new Date('2026-10-29T07:00:00Z');

describe('<HomeContent /> from a dashboard fixture', () => {
  it('shows the greeting, one continue card, goal and study activity', async () => {
    await renderWithProviders(<HomeContent dashboard={dashboardFixture} timeZone="Africa/Addis_Ababa" now={morning} />);

    expect(await screen.findByText('Good morning, Selam')).toBeTruthy();
    expect(screen.getByTestId('continue-title').props.children).toBe('Limits & continuity');
    expect(screen.getByText('Chapter 02 · Mathematics')).toBeTruthy();
    expect(screen.getByText('12 of 20 min')).toBeTruthy();
    expect(screen.getByText('8 min to go today')).toBeTruthy();

    expect(screen.getByTestId('stat-xp').props.accessibilityLabel).toBe('140 XP earned');
    expect(screen.getByTestId('stat-chapters').props.accessibilityLabel).toBe('1/3 Chapters completed');
    expect(screen.getByTestId('stat-accuracy').props.accessibilityLabel).toBe('67% Accuracy');
    expect(screen.getByTestId('reminder-empty')).toBeTruthy();
    expect(screen.getByText('Start “Derivatives” when you are ready.')).toBeTruthy();
    expect(screen.getByTestId('demo-notice')).toBeTruthy();
  });

  it('routes the primary action by the continue-studying action', async () => {
    await renderWithProviders(<HomeContent dashboard={dashboardFixture} timeZone="Africa/Addis_Ababa" now={morning} />);
    await fireEvent.press(await screen.findByTestId('continue-button'));
    expect(router.push).toHaveBeenCalledWith('/session/00000000-0000-4000-8000-000000000102');

    await fireEvent.press(screen.getByTestId('rec-start_chapter'));
    expect(router.push).toHaveBeenCalledWith('/lesson/derivatives');
  });

  it('offers AI and revision as contextual quick actions', async () => {
    await renderWithProviders(<HomeContent dashboard={dashboardFixture} timeZone="Africa/Addis_Ababa" now={morning} />);
    await fireEvent.press(await screen.findByLabelText('Ask AI'));
    expect(router.push).toHaveBeenCalledWith('/tutor');
    await fireEvent.press(screen.getByLabelText('Quick revision'));
    expect(router.push).toHaveBeenCalledWith('/revision');
  });

  it('greets without a name and hides the demo notice for accounts', async () => {
    await renderWithProviders(
      <HomeContent
        dashboard={{ ...dashboardFixture, displayName: null, isDemo: false, continueStudying: null }}
        timeZone="Africa/Addis_Ababa"
        now={morning}
      />,
    );
    expect(await screen.findByText('Welcome back')).toBeTruthy();
    expect(screen.queryByTestId('demo-notice')).toBeNull();
    expect(screen.queryByTestId('continue-button')).toBeNull();
  });
});

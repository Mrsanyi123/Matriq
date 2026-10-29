import { createMemoryStorage } from '@matriq/api-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DEMO_CHOICE_KEY, useSession } from '../lib/session';
import { renderWithProviders } from '../test/render';
import { WelcomeScreen } from './WelcomeScreen';

function SessionStatus() {
  const { state } = useSession();
  return <Text testID="status">{state.status}</Text>;
}

describe('<WelcomeScreen /> without Supabase configuration', () => {
  it('says accounts are not configured, offers only the demo, and remembers the choice', async () => {
    const storage = createMemoryStorage();
    await renderWithProviders(
      <>
        <WelcomeScreen />
        <SessionStatus />
      </>,
      { storage, demo: false },
    );

    expect(await screen.findByTestId('accounts-not-configured')).toBeTruthy();
    expect(screen.queryByTestId('email-input')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('signedOut'));

    await fireEvent.press(screen.getByTestId('try-demo'));
    expect(screen.getByTestId('status').props.children).toBe('demo');
    expect(await storage.getItem(DEMO_CHOICE_KEY)).toBe('1');
  });
});

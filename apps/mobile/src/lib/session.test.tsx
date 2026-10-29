import { createMemoryStorage, isMatriqApiError } from '@matriq/api-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DEMO_CHOICE_KEY, SessionProvider, useSession, type SessionContextValue } from './session';

function fakeSupabase() {
  const session = { user: { email: 'selam@example.com' } };
  const auth = {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signInWithOtp: jest.fn(async () => ({ data: {}, error: null })),
    verifyOtp: jest.fn(async ({ token }: { token: string }) =>
      token === '123456'
        ? { data: { session }, error: null }
        : { data: { session: null }, error: { status: 403, code: 'otp_expired' } },
    ),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(async () => undefined),
    stopAutoRefresh: jest.fn(async () => undefined),
  };
  // Server answers as if the JWT were missing, so we can see the call is real.
  const rpc = jest.fn(async () => ({ data: null, error: { code: '42501', message: 'Not signed in' } }));
  return { auth, rpc, client: { auth, rpc } as unknown as SupabaseClient };
}

let ctx: SessionContextValue;
function Probe() {
  ctx = useSession();
  return <Text testID="status">{`${ctx.state.status}:${ctx.api?.mode ?? 'none'}`}</Text>;
}

async function setup(initial: Record<string, string> = {}) {
  const { auth, rpc, client } = fakeSupabase();
  const storage = createMemoryStorage(initial);
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider supabase={client} storage={storage}>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { auth, rpc, storage };
}

describe('SessionProvider with Supabase', () => {
  it('signs in with an email one-time code and switches to the Supabase API', async () => {
    const { auth, rpc, storage } = await setup({ [DEMO_CHOICE_KEY]: '1' });
    expect((await screen.findByText('demo:demo')).props.children).toBe('demo:demo');
    expect(ctx.accountsAvailable).toBe(true);

    await act(() => ctx.requestCode('selam@example.com'));
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'selam@example.com',
      options: { shouldCreateUser: true },
    });

    await expect(ctx.verifyCode('selam@example.com', '000000')).rejects.toMatchObject({ code: 'otp_expired' });
    await act(() => ctx.verifyCode('selam@example.com', '123456'));
    expect(auth.verifyOtp).toHaveBeenLastCalledWith({ email: 'selam@example.com', token: '123456', type: 'email' });
    expect(screen.getByTestId('status').props.children).toBe('signedIn:supabase');
    expect(await storage.getItem(DEMO_CHOICE_KEY)).toBeNull();

    // Account data comes from the server; errors surface instead of falling back to demo data.
    const error = await ctx.api!.getDashboard().catch((e: unknown) => e);
    expect(rpc).toHaveBeenCalledWith('get_learner_facts', { p_subject_slug: null });
    expect(isMatriqApiError(error) && error.code).toBe('unauthorized');

    await act(() => ctx.signOut());
    expect(auth.signOut).toHaveBeenCalled();
    expect(screen.getByTestId('status').props.children).toBe('signedOut:none');
  });

  it('prefers a stored Supabase session over a remembered demo choice', async () => {
    const { auth, client } = fakeSupabase();
    auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'selam@example.com' } } },
      error: null,
    } as never);
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionProvider supabase={client} storage={createMemoryStorage({ [DEMO_CHOICE_KEY]: '1' })}>
          <Probe />
        </SessionProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('signedIn:supabase')).toBeTruthy();
  });
});

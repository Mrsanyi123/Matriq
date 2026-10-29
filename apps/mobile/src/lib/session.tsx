import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDemoApi,
  createSupabaseApi,
  queryKeys,
  type KeyValueStorage,
  type MatriqApi,
} from '@matriq/api-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

/** Remembers that this device chose the guest demo. */
export const DEMO_CHOICE_KEY = 'matriq.mobile.demoChosen';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'demo' }
  | { status: 'signedIn'; email: string | null };

export interface SessionContextValue {
  state: AuthState;
  /** The data API for the current mode, or null when nobody is signed in. */
  api: MatriqApi | null;
  /** The most recent non-null API (see useApi). */
  lastApi: MatriqApi | null;
  /** False when this build has no Supabase URL/key: only the demo is offered. */
  accountsAvailable: boolean;
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  startDemo(): Promise<void>;
  /** Signs out of an account, or leaves the demo (device progress is kept). */
  signOut(): Promise<void>;
  /** Clears demo progress stored on this device. */
  resetDemo(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
  /** Null when Supabase is not configured for this build. */
  supabase: SupabaseClient | null;
  /** Device storage for the demo and the demo choice (AsyncStorage by default). */
  storage?: KeyValueStorage;
}

export function SessionProvider({ children, supabase, storage = AsyncStorage }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [state, setStateRaw] = useState<AuthState>({ status: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Demo and account data must never share cached queries (nor two accounts).
   * The cache is cleared *before* the new mode renders, so freshly mounted
   * queries are never orphaned by a later clear.
   */
  const setState = useCallback(
    (next: AuthState) => {
      const prev = stateRef.current;
      const changed =
        prev.status !== next.status ||
        (prev.status === 'signedIn' && next.status === 'signedIn' && prev.email !== next.email);
      if (changed && prev.status !== 'loading') queryClient.clear();
      stateRef.current = next;
      setStateRaw(next);
    },
    [queryClient],
  );
  const demoApi = useMemo(() => createDemoApi(storage), [storage]);
  const supabaseApi = useMemo(() => (supabase ? createSupabaseApi(supabase) : null), [supabase]);
  const demoChosen = useRef(false);

  // Restore: a real session wins over a remembered demo choice.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen = false;
      try {
        chosen = (await storage.getItem(DEMO_CHOICE_KEY)) === '1';
      } catch {
        chosen = false;
      }
      demoChosen.current = chosen;
      let email: string | null | undefined;
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) email = data.session.user.email ?? null;
        } catch {
          // Unreadable session storage: treat as signed out.
        }
      }
      if (cancelled) return;
      if (email !== undefined) setState({ status: 'signedIn', email });
      else setState(chosen ? { status: 'demo' } : { status: 'signedOut' });
    })();
    return () => {
      cancelled = true;
    };
  }, [setState, storage, supabase]);

  // Follow Supabase auth events (token refresh failures, sign-out elsewhere).
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (session) setState({ status: 'signedIn', email: session.user.email ?? null });
      else if (event === 'SIGNED_OUT')
        setState(demoChosen.current ? { status: 'demo' } : { status: 'signedOut' });
    });
    return () => data.subscription.unsubscribe();
  }, [setState, supabase]);

  // Supabase recommends refreshing tokens only while the app is in the foreground.
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    if (AppState.currentState === 'active') void supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, [supabase]);

  const requestCode = useCallback(
    async (email: string) => {
      if (!supabase) throw new Error('not_configured');
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    },
    [supabase],
  );

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      if (!supabase) throw new Error('not_configured');
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
      demoChosen.current = false;
      await storage.removeItem(DEMO_CHOICE_KEY).catch(() => undefined);
      if (data.session) setState({ status: 'signedIn', email: data.session.user.email ?? email });
    },
    [setState, storage, supabase],
  );

  const startDemo = useCallback(async () => {
    demoChosen.current = true;
    await storage.setItem(DEMO_CHOICE_KEY, '1').catch(() => undefined);
    setState({ status: 'demo' });
  }, [setState, storage]);

  const signOut = useCallback(async () => {
    demoChosen.current = false;
    await storage.removeItem(DEMO_CHOICE_KEY).catch(() => undefined);
    if (state.status === 'signedIn' && supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    setState({ status: 'signedOut' });
  }, [setState, state.status, storage, supabase]);

  const resetDemo = useCallback(async () => {
    await demoApi.reset();
    // Refetch in place: mounted screens keep their observers.
    await queryClient.resetQueries({ queryKey: queryKeys.scope('demo') });
  }, [demoApi, queryClient]);

  const api: MatriqApi | null =
    state.status === 'demo' ? demoApi : state.status === 'signedIn' ? supabaseApi : null;
  // Screens being torn down after sign-out may render once more before the
  // navigator removes them; they keep the API they were opened with.
  const lastApi = useRef<MatriqApi | null>(null);
  if (api) lastApi.current = api;

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      api,
      lastApi: lastApi.current,
      accountsAvailable: supabase !== null,
      requestCode,
      verifyCode,
      startDemo,
      signOut,
      resetDemo,
    }),
    [api, requestCode, resetDemo, signOut, startDemo, state, supabase, verifyCode],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** The data API. Only call from screens that require a signed-in or demo user. */
export function useApi(): MatriqApi {
  const { api, lastApi } = useSession();
  const current = api ?? lastApi;
  if (!current) throw new Error('useApi called without an active session');
  return current;
}

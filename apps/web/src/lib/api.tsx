'use client';

import {
  createDemoApi,
  createSupabaseApi,
  createWebStorage,
  learnerDataKeys,
  matriqQueries,
  type MatriqApi,
} from '@matriq/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { MODE_COOKIE, clearClientCookie, setClientCookie } from './cookies';
import { isSupabaseConfigured } from './env';
import { getBrowserSupabase } from './supabase/browser';

export type AppMode = 'demo' | 'supabase';
export type DemoApi = ReturnType<typeof createDemoApi>;

interface ApiContextValue {
  /** Null when neither the demo nor accounts are available (welcome only). */
  mode: AppMode | null;
  api: MatriqApi | null;
  /** Present in demo mode only (offers `reset()`). */
  demoApi: DemoApi | null;
  /** Switches to the on-device demo and remembers it in a cookie. */
  enterDemo: () => DemoApi;
  /** Leaves the demo (progress stays on the device) or signs out. */
  leave: () => Promise<void>;
  /** Called after a successful sign-in. */
  enterAccount: () => void;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({
  initialMode,
  apiOverride,
  children,
}: {
  initialMode: AppMode | null;
  /** Tests inject an API instance. */
  apiOverride?: MatriqApi;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AppMode | null>(apiOverride ? apiOverride.mode : initialMode);
  const demoRef = useRef<DemoApi | null>(null);
  const supabaseRef = useRef<MatriqApi | null>(null);

  const getDemo = useCallback(() => {
    demoRef.current ??= createDemoApi(
      createWebStorage(() => (typeof window === 'undefined' ? undefined : window.localStorage)),
    );
    return demoRef.current;
  }, []);

  const getSupabaseApi = useCallback(() => {
    const client = getBrowserSupabase();
    if (!client) return null;
    supabaseRef.current ??= createSupabaseApi(client);
    return supabaseRef.current;
  }, []);

  const enterDemo = useCallback(() => {
    setClientCookie(MODE_COOKIE, 'demo');
    queryClient.removeQueries({ queryKey: learnerDataKeys('supabase')[0] });
    setMode('demo');
    return getDemo();
  }, [getDemo, queryClient]);

  const enterAccount = useCallback(() => {
    clearClientCookie(MODE_COOKIE);
    queryClient.clear();
    setMode('supabase');
  }, [queryClient]);

  const leave = useCallback(async () => {
    if (mode === 'demo') {
      clearClientCookie(MODE_COOKIE);
    } else {
      await getBrowserSupabase()?.auth.signOut();
    }
    queryClient.clear();
    setMode(isSupabaseConfigured ? 'supabase' : null);
  }, [mode, queryClient]);

  const value = useMemo<ApiContextValue>(() => {
    let api: MatriqApi | null = null;
    if (apiOverride) api = apiOverride;
    else if (mode === 'demo') api = getDemo();
    else if (mode === 'supabase') api = getSupabaseApi();
    const demoApi = mode === 'demo' && !apiOverride ? getDemo() : null;
    return { mode, api, demoApi, enterDemo, leave, enterAccount };
  }, [apiOverride, mode, getDemo, getSupabaseApi, enterDemo, leave, enterAccount]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApiContext must be used inside <ApiProvider>');
  return value;
}

/** The active API plus its query option factories. Only for signed-in/demo screens. */
export function useMatriq() {
  const { api } = useApiContext();
  if (!api) throw new Error('No Matriq API available: the app shell should have redirected.');
  const queries = useMemo(() => matriqQueries(api), [api]);
  const queryClient = useQueryClient();
  const invalidateLearnerData = useCallback(
    (options?: { refetch?: boolean }) =>
      Promise.all(
        learnerDataKeys(api.mode).map((queryKey) =>
          queryClient.invalidateQueries({
            queryKey,
            refetchType: options?.refetch === false ? 'none' : 'active',
          }),
        ),
      ),
    [api, queryClient],
  );
  return { api, queries, invalidateLearnerData };
}

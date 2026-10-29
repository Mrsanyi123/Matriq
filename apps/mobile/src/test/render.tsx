import { createMemoryStorage, type KeyValueStorage } from '@matriq/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../i18n/I18nProvider';
import { DEMO_CHOICE_KEY, SessionProvider, useSession } from '../lib/session';

export interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  navigate: jest.Mock;
  back: jest.Mock;
  dismissTo: jest.Mock;
  canGoBack: jest.Mock;
}

/** The expo-router mock installed by jest.setup.ts. */
export const router = (globalThis as unknown as { __mockRouter: MockRouter }).__mockRouter;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * Renders inside the real providers: QueryClient, SessionProvider (no
 * Supabase; demo chosen by default) and I18nProvider.
 */
export async function renderWithProviders(
  ui: ReactElement,
  { storage, demo = true }: { storage?: KeyValueStorage; demo?: boolean } = {},
) {
  const store = storage ?? createMemoryStorage(demo ? { [DEMO_CHOICE_KEY]: '1' } : {});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const result = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider supabase={null} storage={store}>
          <I18nProvider storage={store}>{demo ? <WhenReady>{ui}</WhenReady> : ui}</I18nProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return { ...result, queryClient, storage: store };
}

/** Screens that need the API render once the demo session is restored. */
function WhenReady({ children }: { children: ReactNode }) {
  const { api } = useSession();
  return api ? children : null;
}

import { createDemoApi, createMemoryStorage, type MatriqApi } from '@matriq/api-client';
import type { InterfaceLanguage } from '@matriq/types';
import { render, type RenderOptions } from '@testing-library/react';
import { Providers, createQueryClient } from '@/app/providers';

/** A fresh in-memory demo API (fixed clock: Thursday 2026-10-29, 10:00 Addis Ababa). */
export function testDemoApi(now = new Date('2026-10-29T07:00:00Z')) {
  return createDemoApi(createMemoryStorage(), { now: () => now });
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    api = testDemoApi(),
    language = 'en',
    ...options
  }: { api?: MatriqApi; language?: InterfaceLanguage } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Providers initialMode={api.mode} initialLanguage={language} apiOverride={api} queryClient={queryClient}>
      {children}
    </Providers>
  );
  const result = render(ui, { wrapper, ...options });
  return { ...result, api, queryClient };
}

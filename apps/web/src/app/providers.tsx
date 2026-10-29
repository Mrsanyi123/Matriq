'use client';

import type { MatriqApi } from '@matriq/api-client';
import type { InterfaceLanguage } from '@matriq/types';
import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiProvider, type AppMode } from '@/lib/api';
import { shouldRetry } from '@/lib/errors';
import { I18nProvider } from '@/lib/i18n';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function Providers({
  initialMode,
  initialLanguage,
  apiOverride,
  queryClient,
  children,
}: {
  initialMode: AppMode | null;
  initialLanguage: InterfaceLanguage;
  apiOverride?: MatriqApi;
  queryClient?: QueryClient;
  children: React.ReactNode;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLanguage={initialLanguage}>
        <ApiProvider initialMode={initialMode} apiOverride={apiOverride}>
          <Tooltip.Provider delayDuration={250}>{children}</Tooltip.Provider>
        </ApiProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

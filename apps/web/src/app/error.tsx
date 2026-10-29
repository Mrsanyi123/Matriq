'use client';

import { ErrorState } from '@/components/states';

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <ErrorState error={error} onRetry={reset} />
    </main>
  );
}

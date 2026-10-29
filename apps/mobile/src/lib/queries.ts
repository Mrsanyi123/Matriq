import { learnerDataKeys, matriqQueries, type MatriqApi } from '@matriq/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useApi } from './session';

/** TanStack Query option factories bound to the current API. */
export function useMatriqQueries() {
  const api = useApi();
  return useMemo(() => matriqQueries(api), [api]);
}

/** Refresh learner data after a learning action (answer, lesson read, …). */
export function useInvalidateLearnerData() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useCallback(() => invalidateLearnerData(queryClient, api.mode), [api.mode, queryClient]);
}

export async function invalidateLearnerData(
  queryClient: ReturnType<typeof useQueryClient>,
  mode: MatriqApi['mode'],
) {
  await Promise.all(
    learnerDataKeys(mode).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

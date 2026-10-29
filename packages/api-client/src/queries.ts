import type { MatriqApi } from './api';

/**
 * TanStack Query keys and option factories. They are plain objects, so this
 * package does not depend on React; apps pass them to `useQuery`:
 *
 *   const queries = matriqQueries(api);
 *   const dashboard = useQuery(queries.dashboard());
 *
 * Keys include the API mode so demo and account data never share a cache
 * entry. Clear the whole cache on sign-in/sign-out.
 */
export const queryKeys = {
  all: ['matriq'] as const,
  scope: (mode: MatriqApi['mode']) => ['matriq', mode] as const,
  profile: (mode: MatriqApi['mode']) => ['matriq', mode, 'profile'] as const,
  preferences: (mode: MatriqApi['mode']) => ['matriq', mode, 'preferences'] as const,
  onboardingOptions: (mode: MatriqApi['mode']) => ['matriq', mode, 'onboarding-options'] as const,
  dashboard: (mode: MatriqApi['mode']) => ['matriq', mode, 'dashboard'] as const,
  progress: (mode: MatriqApi['mode']) => ['matriq', mode, 'progress'] as const,
  coursePath: (mode: MatriqApi['mode'], subjectSlug: string | null) =>
    ['matriq', mode, 'course-path', subjectSlug] as const,
  chapter: (mode: MatriqApi['mode'], slug: string) => ['matriq', mode, 'chapter', slug] as const,
  reminders: (mode: MatriqApi['mode']) => ['matriq', mode, 'reminders'] as const,
};

/** Stale times (ms). Curriculum is near-static; learner data refreshes often. */
export const STALE_TIME = {
  curriculum: 10 * 60_000,
  learner: 30_000,
} as const;

export function matriqQueries(api: MatriqApi) {
  const m = api.mode;
  return {
    profile: () => ({
      queryKey: queryKeys.profile(m),
      queryFn: () => api.getProfile(),
      staleTime: STALE_TIME.learner,
    }),
    preferences: () => ({
      queryKey: queryKeys.preferences(m),
      queryFn: () => api.getPreferences(),
      staleTime: STALE_TIME.learner,
    }),
    onboardingOptions: () => ({
      queryKey: queryKeys.onboardingOptions(m),
      queryFn: () => api.getOnboardingOptions(),
      staleTime: STALE_TIME.curriculum,
    }),
    dashboard: () => ({
      queryKey: queryKeys.dashboard(m),
      queryFn: () => api.getDashboard(),
      staleTime: STALE_TIME.learner,
    }),
    progress: () => ({
      queryKey: queryKeys.progress(m),
      queryFn: () => api.getProgress(),
      staleTime: STALE_TIME.learner,
    }),
    coursePath: (subjectSlug?: string) => ({
      queryKey: queryKeys.coursePath(m, subjectSlug ?? null),
      queryFn: () => api.getCoursePath(subjectSlug),
      staleTime: STALE_TIME.learner,
    }),
    chapter: (slug: string) => ({
      queryKey: queryKeys.chapter(m, slug),
      queryFn: () => api.getChapter(slug),
      staleTime: STALE_TIME.learner,
    }),
    reminders: () => ({
      queryKey: queryKeys.reminders(m),
      queryFn: () => api.listReminders(),
      staleTime: STALE_TIME.learner,
    }),
  };
}

/**
 * Query keys to invalidate after a learning action (answer, lesson read,
 * session complete, study time, preference change). Invalidating the whole
 * mode scope is simple and cheap at this data size.
 */
export function learnerDataKeys(mode: MatriqApi['mode']) {
  return [queryKeys.scope(mode)];
}

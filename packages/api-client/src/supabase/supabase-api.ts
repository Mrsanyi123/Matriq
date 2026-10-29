import type { SupabaseClient } from '@supabase/supabase-js';
import { MatriqApiError, type MatriqApi } from '../api';

/**
 * Production implementation backed by Supabase (Auth + Postgres + RLS).
 *
 * WORK IN PROGRESS: being implemented alongside supabase/migrations. Until
 * then every method rejects with `not_configured`, and apps should fall back
 * to the demo experience. Do not replace this with fake data.
 */
export function createSupabaseApi(client: SupabaseClient): MatriqApi {
  void client;
  const notYet = () =>
    Promise.reject(new MatriqApiError('not_configured', 'Supabase data layer not implemented yet'));
  return {
    mode: 'supabase',
    getProfile: notYet,
    updateProfile: notYet,
    getPreferences: notYet,
    updatePreferences: notYet,
    getOnboardingOptions: notYet,
    completeOnboarding: notYet,
    getDashboard: notYet,
    getProgress: notYet,
    getCoursePath: notYet,
    getChapter: notYet,
    markLessonRead: notYet,
    startChapterPractice: notYet,
    submitAttempt: notYet,
    completePracticeSession: notYet,
    recordStudyTime: notYet,
    listReminders: notYet,
    createReminder: notYet,
    deleteReminder: notYet,
  };
}

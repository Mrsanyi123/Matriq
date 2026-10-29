import type { SupabaseClient } from '@supabase/supabase-js';
import { buildDashboard, buildProgressSummary } from '@matriq/core';
import {
  AttemptResultSchema,
  CreateReminderInputSchema,
  OnboardingInputSchema,
  OnboardingOptionsSchema,
  PracticeSessionResultSchema,
  PracticeSetSchema,
  RecordStudyTimeInputSchema,
  SubmitAttemptInputSchema,
  TimeZoneSchema,
  UpdatePreferencesInputSchema,
} from '@matriq/validation';
import type { z } from 'zod';
import { MatriqApiError, type MatriqApi, type MatriqApiErrorCode, type UpdateProfileInput } from '../api';
import {
  AccountPayloadSchema,
  ChapterPayloadSchema,
  LearnerFactsPayloadSchema,
  normaliseAchievements,
  toChapterDetail,
  toCoursePath,
  toLearnerFacts,
  toReminder,
} from './mappers';

/** SQLSTATE codes raised by Matriq's SQL functions, mapped to API errors. */
const SQLSTATE_CODES: Record<string, MatriqApiErrorCode> = {
  '42501': 'unauthorized',
  P0002: 'not_found',
  '22023': 'validation',
  '22P02': 'validation',
  '23514': 'validation',
  '23505': 'conflict',
  '55000': 'conflict',
  '54000': 'rate_limited',
  PGRST301: 'unauthorized',
  PGRST303: 'unauthorized',
};

interface PostgrestLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

export function toApiError(error: PostgrestLikeError): MatriqApiError {
  const code = error.code ? SQLSTATE_CODES[error.code] : undefined;
  if (code) return new MatriqApiError(code, error.message, error);
  if (!error.code && /fetch|network|timed out|offline/i.test(error.message)) {
    return new MatriqApiError('network', 'Network unavailable', error);
  }
  return new MatriqApiError('unknown', error.message, error);
}

function parse<S extends z.ZodType>(schema: S, value: unknown, what: string): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new MatriqApiError('unknown', `Unexpected ${what} response: ${result.error.message}`);
  }
  return result.data;
}

function input<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new MatriqApiError('validation', result.error.message);
  return result.data;
}

function deviceTimeZone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TimeZoneSchema.safeParse(tz).success ? tz : undefined;
  } catch {
    return undefined;
  }
}

export interface SupabaseApiOptions {
  /** Injectable clock for tests. */
  now?: () => Date;
}

/**
 * Production implementation backed by Supabase Auth + Postgres. All writes
 * go through SECURITY DEFINER functions that check ownership and award XP
 * server-side; reads go through RLS-protected functions and tables.
 */
export function createSupabaseApi(client: SupabaseClient, options: SupabaseApiOptions = {}): MatriqApi {
  const now = options.now ?? (() => new Date());

  async function rpc(fn: string, args?: Record<string, unknown>): Promise<unknown> {
    let response;
    try {
      response = await client.rpc(fn, args);
    } catch (cause) {
      throw new MatriqApiError('network', 'Network unavailable', cause);
    }
    if (response.error) throw toApiError(response.error);
    return response.data;
  }

  async function account() {
    return parse(AccountPayloadSchema, await rpc('get_my_account'), 'account');
  }

  async function facts(subjectSlug?: string) {
    const raw = await rpc('get_learner_facts', { p_subject_slug: subjectSlug ?? null });
    return parse(LearnerFactsPayloadSchema, raw, 'learner facts');
  }

  async function subjectIdForSlug(slug: string | null): Promise<string | null> {
    if (slug === null) return null;
    const { data, error } = await client.from('subjects').select('id').eq('slug', slug).maybeSingle();
    if (error) throw toApiError(error);
    if (!data) throw new MatriqApiError('validation', `Unknown subject: ${slug}`);
    return (data as { id: string }).id;
  }

  const reminderColumns = 'id, title, days_of_week, local_time, time_zone, enabled, subjects(slug)';

  return {
    mode: 'supabase',

    async getProfile() {
      return (await account()).profile;
    },

    async updateProfile(patch: UpdateProfileInput) {
      await rpc('update_my_profile', { p_patch: patch });
      return (await account()).profile;
    },

    async getPreferences() {
      return (await account()).preferences;
    },

    async updatePreferences(patch) {
      await rpc('update_my_preferences', { p_patch: input(UpdatePreferencesInputSchema, patch) });
      return (await account()).preferences;
    },

    async getOnboardingOptions() {
      return parse(OnboardingOptionsSchema, await rpc('get_onboarding_options'), 'onboarding options');
    },

    async completeOnboarding(value) {
      const data = input(OnboardingInputSchema, value);
      await rpc('complete_onboarding', {
        p_grade_level: data.gradeLevel,
        p_stream: data.stream,
        p_subject_slugs: data.subjectSlugs,
        p_target_exam: data.targetExam,
        p_interface_language: data.interfaceLanguage,
        p_daily_goal_minutes: data.dailyGoalMinutes,
        p_display_name: data.displayName ?? null,
        p_time_zone: data.timeZone ?? deviceTimeZone() ?? null,
      });
    },

    async getDashboard() {
      return buildDashboard(toLearnerFacts(await facts(), now()));
    },

    async getProgress() {
      return buildProgressSummary(toLearnerFacts(await facts(), now()));
    },

    async getCoursePath(subjectSlug) {
      return toCoursePath(await facts(subjectSlug));
    },

    async getChapter(slug) {
      const raw = await rpc('get_chapter', { p_slug: slug });
      if (raw === null) throw new MatriqApiError('not_found', 'Chapter not found');
      return toChapterDetail(parse(ChapterPayloadSchema, raw, 'chapter'));
    },

    async markLessonRead(chapterId) {
      const xp = await rpc('mark_lesson_read', { p_topic_id: chapterId });
      return { xpAwarded: typeof xp === 'number' ? xp : 0 };
    },

    async startChapterPractice(chapterId) {
      return parse(PracticeSetSchema, await rpc('start_chapter_practice', { p_topic_id: chapterId }), 'practice set');
    },

    async submitAttempt(value) {
      const data = input(SubmitAttemptInputSchema, value);
      const raw = await rpc('submit_question_attempt', {
        p_session_id: data.sessionId,
        p_question_id: data.questionId,
        p_option_id: data.optionId,
        p_time_spent_ms: data.timeSpentMs ?? null,
      });
      return parse(AttemptResultSchema, raw, 'attempt result');
    },

    async completePracticeSession(sessionId) {
      const raw = await rpc('complete_practice_session', { p_session_id: sessionId });
      const normalised =
        raw && typeof raw === 'object' && Array.isArray((raw as { newAchievements?: unknown }).newAchievements)
          ? normaliseAchievements(raw as { newAchievements: { earnedAt: string | null }[] })
          : raw;
      return parse(PracticeSessionResultSchema, normalised, 'session result');
    },

    async recordStudyTime(value) {
      const data = input(RecordStudyTimeInputSchema, value);
      await rpc('record_study_time', { p_seconds: data.seconds, p_topic_id: data.chapterId ?? null });
    },

    async listReminders() {
      const { data, error } = await client
        .from('study_reminders')
        .select(reminderColumns)
        .order('created_at');
      if (error) throw toApiError(error);
      return (data as unknown as Parameters<typeof toReminder>[0][]).map(toReminder);
    },

    async createReminder(value) {
      const data = input(CreateReminderInputSchema, value);
      const { data: row, error } = await client
        .from('study_reminders')
        .insert({
          title: data.title,
          subject_id: await subjectIdForSlug(data.subjectSlug),
          days_of_week: data.daysOfWeek,
          local_time: data.localTime,
          time_zone: data.timeZone,
        })
        .select(reminderColumns)
        .single();
      if (error) throw toApiError(error);
      return toReminder(row as unknown as Parameters<typeof toReminder>[0]);
    },

    async deleteReminder(id) {
      const { error } = await client.from('study_reminders').delete().eq('id', id);
      if (error) throw toApiError(error);
    },
  };
}

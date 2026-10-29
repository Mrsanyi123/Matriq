import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseApi, type MatriqApi } from '@matriq/api-client';
import { ACHIEVEMENTS, XP_RULES } from '@matriq/core';
import { DEMO_CHAPTERS, SUBJECTS } from '@matriq/demo-content';
import * as types from '@matriq/types';
import {
  ChapterDetailSchema,
  CoursePathSchema,
  DashboardSchema,
  OnboardingOptionsSchema,
  ProgressSummarySchema,
} from '@matriq/validation';
import { as, createTestDatabase, createUser, rpcClient, type TestDatabase } from './support/db';

let db: TestDatabase;
beforeAll(async () => {
  db = await createTestDatabase();
}, 60_000);
afterAll(async () => {
  await db?.drop();
});

const chapter1 = DEMO_CHAPTERS[0]!;
const chapter2 = DEMO_CHAPTERS[1]!;
const q1 = chapter1.questions[0]!;
const correctOption = (q: (typeof chapter1.questions)[number]) => q.options.find((o) => o.isCorrect)!;
const wrongOption = (q: (typeof chapter1.questions)[number]) => q.options.find((o) => !o.isCorrect)!;

function apiFor(userId: string, now = new Date()): MatriqApi {
  return createSupabaseApi(rpcClient(db.pool, userId) as unknown as SupabaseClient, { now: () => now });
}

async function onboardedStudent(email: string) {
  const id = await createUser(db.pool, email);
  const api = apiFor(id);
  await api.completeOnboarding({
    gradeLevel: 12,
    stream: 'natural_science',
    subjectSlugs: ['mathematics', 'physics'],
    targetExam: 'euee',
    interfaceLanguage: 'en',
    dailyGoalMinutes: 10,
    displayName: 'Student',
    timeZone: 'Africa/Addis_Ababa',
  });
  return { id, api };
}

describe('schema stays in sync with TypeScript', () => {
  const enums: [string, readonly (string | number)[]][] = [
    ['interface_language', types.INTERFACE_LANGUAGES],
    ['study_stream', types.STREAMS],
    ['target_exam', types.TARGET_EXAMS],
    ['explanation_style', types.EXPLANATION_STYLES],
    ['app_role', types.APP_ROLES],
    ['content_status', types.CONTENT_STATUSES],
    ['question_origin', types.QUESTION_ORIGINS],
    ['question_type', types.QUESTION_TYPES],
    ['practice_mode', types.PRACTICE_MODES],
    ['lesson_kind', types.LESSON_KINDS],
    ['lesson_section_kind', types.LESSON_SECTION_KINDS],
    ['revision_card_kind', types.REVISION_CARD_KINDS],
    ['bookmark_target', types.BOOKMARK_TARGETS],
    ['xp_reason', types.XP_REASONS],
  ];

  it.each(enums)('enum %s matches @matriq/types', async (name, values) => {
    const { rows } = await db.pool.query<{ v: string[] }>(
      `select enum_range(null::public.${name})::text[] as v`,
    );
    expect(rows[0]!.v).toEqual([...values]);
  });

  it('awards the same XP as @matriq/core', async () => {
    for (const [reason, amount] of Object.entries(XP_RULES)) {
      const { rows } = await db.pool.query('select public.xp_for_reason($1) as xp', [reason]);
      expect(rows[0].xp, reason).toBe(amount);
    }
  });

  it('has the reference catalogue', async () => {
    const subjects = await db.pool.query('select slug from public.subjects order by position');
    expect(subjects.rows.map((r) => r.slug)).toEqual(SUBJECTS.map((s) => s.slug));
    const achievements = await db.pool.query('select slug, threshold, metric from public.achievements order by slug');
    expect(achievements.rows).toEqual(
      [...ACHIEVEMENTS]
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((a) => ({ slug: a.slug, threshold: a.threshold, metric: a.metric })),
    );
    const grades = await db.pool.query('select level from public.grades order by level');
    expect(grades.rows.map((r) => r.level)).toEqual([...types.GRADE_LEVELS]);
  });
});

describe('row level security', () => {
  it('lets anonymous visitors read published curriculum but not questions or profiles', async () => {
    await as(db.pool, { role: 'anon' }, async (c) => {
      const topics = await c.query('select slug from public.topics order by slug');
      expect(topics.rows).toHaveLength(3);
      await expect(c.query('select id from public.questions')).rejects.toThrow(/permission denied/);
    });
    await as(db.pool, { role: 'anon' }, async (c) => {
      await expect(c.query('select id from public.profiles')).rejects.toThrow(/permission denied/);
    });
  });

  it('hides correct answers and explanations from students', async () => {
    const id = await createUser(db.pool, 'peek@example.com');
    await as(db.pool, { role: 'authenticated', userId: id }, async (c) => {
      const ok = await c.query('select id, prompt, hints from public.questions');
      expect(ok.rows.length).toBeGreaterThan(0);
      const options = await c.query('select id, label, body from public.question_options');
      expect(options.rows.length).toBeGreaterThan(0);
    });
    for (const sql of [
      'select is_correct from public.question_options',
      'select * from public.question_options',
      'select explanation from public.questions',
    ]) {
      await expect(
        as(db.pool, { role: 'authenticated', userId: id }, (c) => c.query(sql)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('isolates every student’s private data', async () => {
    const a = await onboardedStudent('a@example.com');
    const b = await onboardedStudent('b@example.com');
    await a.api.markLessonRead(chapter1.id);
    await db.pool.query(
      `insert into public.study_reminders (user_id, title, days_of_week, local_time) values ($1, 'Maths', '{1}', '18:00')`,
      [a.id],
    );

    await as(db.pool, { role: 'authenticated', userId: b.id }, async (c) => {
      for (const table of ['student_progress', 'daily_activity', 'xp_events', 'study_reminders', 'student_subjects']) {
        const { rows } = await c.query(`select user_id from public.${table}`);
        expect(rows.every((r) => r.user_id === b.id), table).toBe(true);
      }
      const profiles = await c.query('select id from public.profiles');
      expect(profiles.rows.map((r) => r.id)).toEqual([b.id]);
      const updated = await c.query(`update public.study_reminders set title = 'hacked' where user_id = $1`, [a.id]);
      expect(updated.rowCount).toBe(0);
      const deleted = await c.query(`delete from public.study_reminders where user_id = $1`, [a.id]);
      expect(deleted.rowCount).toBe(0);
    });
  });

  it('blocks direct writes to rewards and progress', async () => {
    const id = await createUser(db.pool, 'cheat@example.com');
    const attempts = [
      `insert into public.xp_events (user_id, reason, ref_key, amount, activity_date) values ('${id}', 'correct_answer', 'x', 9999, current_date)`,
      `insert into public.student_progress (user_id, topic_id, completed_at) values ('${id}', '${chapter1.id}', now())`,
      `insert into public.student_achievements (user_id, achievement_id) select '${id}', id from public.achievements`,
      `insert into public.daily_activity (user_id, activity_date) values ('${id}', current_date)`,
      `update public.student_preferences set daily_goal_minutes = 10`,
      `update public.profiles set onboarded_at = now()`,
    ];
    for (const sql of attempts) {
      await expect(
        as(db.pool, { role: 'authenticated', userId: id }, (c) => c.query(sql)),
        sql,
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('prevents students from granting themselves a staff role', async () => {
    const id = await createUser(db.pool, 'wannabe@example.com');
    await expect(
      as(db.pool, { role: 'authenticated', userId: id }, (c) =>
        c.query(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [id]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('shows drafts to reviewers only', async () => {
    const student = await createUser(db.pool, 'draft-student@example.com');
    const reviewer = await createUser(db.pool, 'reviewer@example.com');
    await db.pool.query(`insert into public.user_roles (user_id, role) values ($1, 'reviewer')`, [reviewer]);
    await db.pool.query(
      `insert into public.topics (unit_id, slug, position, title, status) values ($1, 'draft-topic', 9, 'Draft', 'draft')`,
      [chapter1.unitId],
    );
    const count = (userId: string) =>
      as(db.pool, { role: 'authenticated', userId }, async (c) =>
        (await c.query(`select 1 from public.topics where slug = 'draft-topic'`)).rowCount,
      );
    expect(await count(student)).toBe(0);
    expect(await count(reviewer)).toBe(1);
    await db.pool.query(`delete from public.topics where slug = 'draft-topic'`);
    const audit = await db.pool.query(`select action from public.admin_audit_logs where target_table = 'user_roles'`);
    expect(audit.rows.map((r) => r.action)).toContain('insert');
  });
});

describe('content integrity constraints', () => {
  const subjectId = SUBJECTS[0]!.id;

  it('requires provenance for official past-exam questions', async () => {
    await expect(
      db.pool.query(
        `insert into public.questions (origin, prompt, subject_id) values ('official_past_exam', 'Q', $1)`,
        [subjectId],
      ),
    ).rejects.toThrow(/questions_official_provenance/);
  });

  it('requires a model name for AI-generated questions', async () => {
    await expect(
      db.pool.query(`insert into public.questions (origin, prompt, subject_id) values ('ai_generated', 'Q', $1)`, [
        subjectId,
      ]),
    ).rejects.toThrow(/questions_ai_model/);
  });

  it('refuses to publish a question without exactly one correct option', async () => {
    await expect(
      db.pool.query(
        `insert into public.questions (origin, prompt, explanation, subject_id, status)
         values ('original_practice', 'Q', 'E', $1, 'published')`,
        [subjectId],
      ),
    ).rejects.toThrow(/exactly one correct option/);
  });

  it('only publishes embeddable videos', async () => {
    await expect(
      db.pool.query(
        `insert into public.videos (youtube_video_id, title, channel_id, channel_name, is_embeddable, review_status)
         values ('abcdefghijk', 'T', 'c', 'C', false, 'published')`,
      ),
    ).rejects.toThrow(/videos_publishable/);
  });
});

describe('createSupabaseApi against the real database', () => {
  it('serves onboarding options to the contract', async () => {
    const id = await createUser(db.pool, 'options@example.com');
    const options = OnboardingOptionsSchema.parse(await apiFor(id).getOnboardingOptions());
    expect(options.subjects.find((s) => s.slug === 'mathematics')?.hasContent).toBe(true);
    expect(options.subjects.find((s) => s.slug === 'physics')).toMatchObject({
      hasContent: false,
      streams: ['natural_science'],
    });
  });

  it('validates onboarding on the server', async () => {
    const id = await createUser(db.pool, 'bad-onboarding@example.com');
    const client = rpcClient(db.pool, id);
    const base = {
      p_grade_level: 12,
      p_subject_slugs: ['mathematics'],
      p_target_exam: 'euee',
      p_interface_language: 'en',
      p_daily_goal_minutes: 20,
    };
    expect((await client.rpc('complete_onboarding', { ...base, p_stream: null })).error?.code).toBe('22023');
    expect(
      (await client.rpc('complete_onboarding', { ...base, p_stream: 'natural_science', p_subject_slugs: ['history'] }))
        .error?.code,
    ).toBe('22023');
    const profile = await apiFor(id).getProfile();
    expect(profile.onboarded).toBe(false);
  });

  it('runs the full learning loop and matches demo-mode rules', async () => {
    const { api } = await onboardedStudent('loop@example.com');
    expect((await api.getProfile()).onboarded).toBe(true);

    const fresh = DashboardSchema.parse(await api.getDashboard());
    expect(fresh.continueStudying).toMatchObject({ action: 'read', chapter: { number: 1 } });
    expect(fresh.stats.xpTotal).toBe(0);

    const path = CoursePathSchema.parse(await api.getCoursePath());
    expect(path?.chapters.map((c) => c.status)).toEqual(['not_started', 'not_started', 'not_started']);

    const detail = ChapterDetailSchema.parse(await api.getChapter(chapter1.slug));
    expect(detail.fullLesson.some((s) => s.data?.type === 'function_plot')).toBe(true);
    expect(detail.next?.slug).toBe(chapter2.slug);

    expect(await api.markLessonRead(chapter1.id)).toEqual({ xpAwarded: 10 });
    expect(await api.markLessonRead(chapter1.id)).toEqual({ xpAwarded: 0 });

    const set = await api.startChapterPractice(chapter1.id);
    expect(JSON.stringify(set)).not.toMatch(/isCorrect|is_correct|explanation/);
    const results = [];
    for (const [i, q] of chapter1.questions.entries()) {
      const option = i < 2 ? correctOption(q) : wrongOption(q);
      results.push(await api.submitAttempt({ sessionId: set.sessionId, questionId: q.id, optionId: option.id }));
    }
    expect(results.map((r) => r.isCorrect)).toEqual([true, true, false]);
    expect(results[2]!.correctOptionId).toBe(correctOption(chapter1.questions[2]!).id);

    const done = await api.completePracticeSession(set.sessionId);
    expect(done).toMatchObject({ correct: 2, total: 3, passed: true, chapterCompleted: true, xpAwarded: 50 });
    expect(done.newAchievements.map((a) => a.slug)).toEqual(['first-step']);

    const dashboard = DashboardSchema.parse(await api.getDashboard());
    // Same total as the demo-mode test: 10 + 2×10 + 50.
    expect(dashboard.stats).toMatchObject({
      xpTotal: 80,
      chaptersCompleted: 1,
      questionsAnswered: 3,
      correctAnswers: 2,
      accuracy: 67,
      streakDays: 1,
    });
    expect(dashboard.continueStudying?.chapter.number).toBe(2);
    expect(dashboard.isDemo).toBe(true);

    const progress = ProgressSummarySchema.parse(await api.getProgress());
    expect(progress.achievements.find((a) => a.slug === 'first-step')?.earned).toBe(true);
    expect(progress.chapters[0]).toMatchObject({ status: 'completed', bestScore: 67 });

    // A second pass never re-awards chapter XP.
    const again = await api.startChapterPractice(chapter1.id);
    for (const q of chapter1.questions) {
      await api.submitAttempt({ sessionId: again.sessionId, questionId: q.id, optionId: correctOption(q).id });
    }
    const second = await api.completePracticeSession(again.sessionId);
    expect(second).toMatchObject({ correct: 3, chapterCompleted: false, xpAwarded: 0 });
    expect((await api.getProgress()).chapters[0]?.bestScore).toBe(100);
  });

  it('rejects tampered attempts', async () => {
    const a = await onboardedStudent('tamper-a@example.com');
    const b = await onboardedStudent('tamper-b@example.com');
    const set = await a.api.startChapterPractice(chapter1.id);

    await expect(
      b.api.submitAttempt({ sessionId: set.sessionId, questionId: q1.id, optionId: correctOption(q1).id }),
    ).rejects.toMatchObject({ code: 'conflict' });

    const otherQuestion = chapter2.questions[0]!;
    await expect(
      a.api.submitAttempt({ sessionId: set.sessionId, questionId: otherQuestion.id, optionId: correctOption(otherQuestion).id }),
    ).rejects.toMatchObject({ code: 'validation' });

    await expect(
      a.api.submitAttempt({ sessionId: set.sessionId, questionId: q1.id, optionId: correctOption(otherQuestion).id }),
    ).rejects.toMatchObject({ code: 'validation' });

    await a.api.completePracticeSession(set.sessionId);
    await expect(
      a.api.submitAttempt({ sessionId: set.sessionId, questionId: q1.id, optionId: correctOption(q1).id }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await expect(a.api.completePracticeSession(set.sessionId)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('records study time towards the daily goal with sane limits', async () => {
    const { id, api } = await onboardedStudent('time@example.com');
    // Pretend local midnight was long ago so the elapsed-time guard allows this.
    const { rows } = await db.pool.query(
      `select extract(epoch from (now() at time zone 'Africa/Addis_Ababa') - date_trunc('day', now() at time zone 'Africa/Addis_Ababa'))::int as s`,
    );
    const elapsed = rows[0].s as number;
    const chunk = Math.min(600, Math.max(60, elapsed - 120));
    await api.recordStudyTime({ seconds: chunk, chapterId: chapter1.id });
    const d = await api.getDashboard();
    expect(d.today.minutes).toBe(Math.floor(chunk / 60));
    if (chunk >= 600) {
      expect(d.today.goalMet).toBe(true);
      expect(d.stats.xpTotal).toBe(XP_RULES.daily_goal_met);
    }
    await expect(api.recordStudyTime({ seconds: 5000 })).rejects.toMatchObject({ code: 'validation' });
    const client = rpcClient(db.pool, id);
    expect((await client.rpc('record_study_time', { p_seconds: 0 })).error?.code).toBe('22023');
  });

  it('returns not_found for unknown or unpublished chapters', async () => {
    const { api } = await onboardedStudent('missing@example.com');
    await expect(api.getChapter('no-such-chapter')).rejects.toMatchObject({ code: 'not_found' });
    await db.pool.query(`update public.topics set status = 'in_review' where id = $1`, [chapter2.id]);
    try {
      await expect(api.getChapter(chapter2.slug)).rejects.toMatchObject({ code: 'not_found' });
      expect((await api.getCoursePath())?.chapters).toHaveLength(2);
      await expect(api.startChapterPractice(chapter2.id)).rejects.toMatchObject({ code: 'not_found' });
    } finally {
      await db.pool.query(`update public.topics set status = 'published' where id = $1`, [chapter2.id]);
    }
  });

  it('updates preferences and profile through validated functions', async () => {
    const { api } = await onboardedStudent('prefs@example.com');
    expect((await api.updatePreferences({ interfaceLanguage: 'om', dailyGoalMinutes: 45 })).interfaceLanguage).toBe('om');
    await expect(api.updatePreferences({ timeZone: 'Mars/Olympus' })).rejects.toMatchObject({ code: 'validation' });
    expect((await api.updateProfile({ gradeLevel: 10, stream: null })).gradeLevel).toBe(10);
    expect(await api.getCoursePath()).toBeNull();
    await expect(api.updateProfile({ gradeLevel: 12 })).rejects.toMatchObject({ code: 'validation' });
  });

  it('requires sign-in', async () => {
    const anonymous = createSupabaseApi(
      {
        rpc: async (fn: string) => {
          try {
            const r = await as(db.pool, { role: 'authenticated' }, (c) => c.query(`select public.${fn}() as result`));
            return { data: r.rows[0]?.result ?? null, error: null };
          } catch (e) {
            return { data: null, error: { code: (e as { code: string }).code, message: (e as Error).message } };
          }
        },
      } as unknown as SupabaseClient,
    );
    await expect(anonymous.getDashboard()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('deletes an account and all its data', async () => {
    const { id, api } = await onboardedStudent('leaving@example.com');
    await api.markLessonRead(chapter1.id);
    const client = rpcClient(db.pool, id);
    expect((await client.rpc('delete_my_account')).error).toBeNull();
    for (const table of ['profiles', 'student_preferences', 'student_progress', 'xp_events', 'daily_activity']) {
      const column = table === 'profiles' ? 'id' : 'user_id';
      const { rowCount } = await db.pool.query(`select 1 from public.${table} where ${column} = $1`, [id]);
      expect(rowCount, table).toBe(0);
    }
  });
});

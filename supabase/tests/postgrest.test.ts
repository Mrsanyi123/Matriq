/**
 * Optional HTTP-level test: runs the real createSupabaseApi through
 * PostgREST (the API server inside Supabase) using @supabase/postgrest-js,
 * the same client supabase-js uses for `.rpc()` and `.from()`.
 *
 * Runs only when these are set (see docs/DATABASE.md#testing):
 *   MATRIQ_TEST_POSTGREST_URL   e.g. http://localhost:54330
 *   MATRIQ_TEST_JWT_SECRET      PostgREST's jwt-secret
 *   MATRIQ_TEST_REST_DB_URL     the database PostgREST serves (to create auth users)
 */
import { createHmac, randomUUID } from 'node:crypto';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { createSupabaseApi } from '@matriq/api-client';
import { DEMO_CHAPTERS } from '@matriq/demo-content';
import { DashboardSchema } from '@matriq/validation';

const url = process.env.MATRIQ_TEST_POSTGREST_URL;
const secret = process.env.MATRIQ_TEST_JWT_SECRET;
const dbUrl = process.env.MATRIQ_TEST_REST_DB_URL;
const enabled = Boolean(url && secret && dbUrl);

const b64 = (value: object | Buffer) =>
  (Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))).toString('base64url');

function jwt(claims: Record<string, unknown>): string {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 });
  const sig = createHmac('sha256', secret!).update(`${head}.${body}`).digest();
  return `${head}.${body}.${b64(sig)}`;
}

function clientFor(userId: string | null) {
  const token = userId ? jwt({ sub: userId, role: 'authenticated' }) : jwt({ role: 'anon' });
  return new PostgrestClient(url!, { headers: { Authorization: `Bearer ${token}` } }) as unknown as SupabaseClient;
}

describe.skipIf(!enabled)('createSupabaseApi over PostgREST', () => {
  const pool = enabled ? new pg.Pool({ connectionString: dbUrl }) : null;
  afterAll(async () => {
    await pool?.end();
  });

  async function newStudent() {
    const id = randomUUID();
    await pool!.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@example.com`]);
    return id;
  }

  it('runs onboarding, practice, reminders and dashboard over HTTP', async () => {
    const id = await newStudent();
    const api = createSupabaseApi(clientFor(id));
    await api.completeOnboarding({
      gradeLevel: 12,
      stream: 'social_science',
      subjectSlugs: ['mathematics', 'history'],
      targetExam: 'euee',
      interfaceLanguage: 'om',
      dailyGoalMinutes: 30,
    });
    expect((await api.getPreferences()).subjectSlugs).toEqual(['mathematics', 'history']);

    const chapter = DEMO_CHAPTERS[0]!;
    const set = await api.startChapterPractice(chapter.id);
    for (const q of chapter.questions) {
      const option = q.options.find((o) => o.isCorrect)!;
      expect((await api.submitAttempt({ sessionId: set.sessionId, questionId: q.id, optionId: option.id })).isCorrect).toBe(true);
    }
    expect(await api.completePracticeSession(set.sessionId)).toMatchObject({ passed: true, xpAwarded: 50 });

    const reminder = await api.createReminder({
      title: 'Maths',
      subjectSlug: 'mathematics',
      daysOfWeek: [1, 3],
      localTime: '18:30',
      timeZone: 'Africa/Addis_Ababa',
    });
    expect(reminder).toMatchObject({ subjectSlug: 'mathematics', localTime: '18:30', enabled: true });
    expect(await api.listReminders()).toHaveLength(1);

    const dashboard = DashboardSchema.parse(await api.getDashboard());
    expect(dashboard.stats).toMatchObject({ xpTotal: 80, chaptersCompleted: 1 });
    expect(dashboard.nextReminder?.id).toBe(reminder.id);

    await api.deleteReminder(reminder.id);
    expect(await api.listReminders()).toHaveLength(0);
  });

  it('keeps students apart and answers hidden over HTTP', async () => {
    const a = await newStudent();
    const b = await newStudent();
    const reminder = await createSupabaseApi(clientFor(a)).createReminder({
      title: 'Private',
      subjectSlug: null,
      daysOfWeek: [2],
      localTime: '07:00',
      timeZone: 'Africa/Addis_Ababa',
    });
    const asB = createSupabaseApi(clientFor(b));
    expect(await asB.listReminders()).toHaveLength(0);
    await asB.deleteReminder(reminder.id); // no error, but nothing deleted
    expect(await createSupabaseApi(clientFor(a)).listReminders()).toHaveLength(1);

    const leak = await clientFor(b).from('question_options').select('is_correct');
    expect(leak.error?.message).toMatch(/permission denied/);
  });

  it('maps sign-in and validation errors', async () => {
    await expect(createSupabaseApi(clientFor(null)).getDashboard()).rejects.toMatchObject({
      code: 'unauthorized',
    });
    const api = createSupabaseApi(clientFor(await newStudent()));
    await expect(api.getChapter('does-not-exist')).rejects.toMatchObject({ code: 'not_found' });
  });
});

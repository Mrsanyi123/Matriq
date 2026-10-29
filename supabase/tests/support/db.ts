import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Admin connection string for a PostgreSQL 15+ server used only for tests.
 * Each test run creates (and drops) its own database on it.
 */
export const ADMIN_URL =
  process.env.MATRIQ_TEST_DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres';

export interface TestDatabase {
  pool: pg.Pool;
  name: string;
  drop(): Promise<void>;
}

/** Creates a fresh database with the Supabase shim, all migrations and the seed. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `matriq_test_${process.pid}_${Date.now()}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });

  const files = [
    join(supabaseDir, 'tests/support/supabase-shim.sql'),
    ...readdirSync(join(supabaseDir, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => join(supabaseDir, 'migrations', f)),
    join(supabaseDir, 'seed/demo_curriculum.sql'),
  ];
  for (const file of files) {
    try {
      await pool.query(readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to apply ${file}: ${(error as Error).message}`);
    }
  }

  return {
    pool,
    name,
    async drop() {
      await pool.end();
      const c = new pg.Client({ connectionString: ADMIN_URL });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}

export type Role = 'anon' | 'authenticated';

/** Runs `fn` in a transaction as an API role, optionally as a specific user. */
export async function as<T>(
  pool: pg.Pool,
  who: { role: Role; userId?: string },
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${who.role}`);
    const claims = JSON.stringify({ sub: who.userId ?? null, role: who.role });
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/** Creates an auth user (which triggers profile + preferences creation). */
export async function createUser(pool: pg.Pool, email: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  );
  return rows[0]!.id;
}

/**
 * The subset of SupabaseClient that `createSupabaseApi` uses for RPCs,
 * executed directly against Postgres as `userId`. Errors are shaped like
 * PostgrestError ({ code, message }) so error mapping is exercised too.
 */
export function rpcClient(pool: pg.Pool, userId: string) {
  return {
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      if (!/^[a-z_]+$/.test(fn)) throw new Error(`Bad function name ${fn}`);
      const keys = Object.keys(args);
      const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as result`;
      try {
        const rows = await as(pool, { role: 'authenticated', userId }, (c) =>
          c.query(sql, keys.map((k) => {
            const v = args[k];
            return v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v;
          })),
        );
        return { data: rows.rows[0]?.result ?? null, error: null };
      } catch (error) {
        const e = error as { code?: string; message: string };
        return { data: null, error: { code: e.code, message: e.message } };
      }
    },
    from() {
      throw new Error('Table access is not supported by the test RPC client');
    },
  };
}

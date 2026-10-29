import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { referenceSql, seedSql } from '../scripts/generate-sql';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('generated SQL', () => {
  it('seed matches @matriq/demo-content (run `pnpm db:seed:generate`)', () => {
    expect(readFileSync(join(root, 'seed/demo_curriculum.sql'), 'utf8')).toBe(seedSql());
  });

  it('reference migration matches the TypeScript catalogue', () => {
    expect(readFileSync(join(root, 'migrations/20261029000800_reference_data.sql'), 'utf8')).toBe(
      referenceSql(),
    );
  });

  it('marks every seeded content row as demo', () => {
    const seed = seedSql();
    expect(seed).toContain("'Matriq pilot (demo curriculum)'");
    expect(seed).not.toMatch(/official_past_exam/);
    expect(seed).not.toMatch(/youtube/i);
  });
});

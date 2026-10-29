import { describe, expect, it } from 'vitest';
import { LessonSectionSchema } from '@matriq/validation';
import { DEMO_CHAPTERS, GRADES, SUBJECTS, demoId } from './index';

describe('demo content', () => {
  const allIds = [
    ...GRADES.map((g) => g.id),
    ...SUBJECTS.map((s) => s.id),
    ...DEMO_CHAPTERS.flatMap((c) => [
      c.id,
      c.fullLessonId,
      c.quickNotesId,
      ...c.fullLesson.map((s) => s.id),
      ...c.quickNotes.map((s) => s.id),
      ...c.questions.flatMap((q) => [q.id, ...q.options.map((o) => o.id)]),
      ...c.revisionCards.map((r) => r.id),
    ]),
  ];

  it('uses unique, valid UUIDs', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const id of allIds) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('is deterministic', () => {
    expect(DEMO_CHAPTERS[0]?.id).toBe(demoId('chapter', 1));
    expect(DEMO_CHAPTERS[0]?.id).toBe('00000000-0000-4000-8000-060000000001');
  });

  it('has exactly three pilot chapters with practice questions', () => {
    expect(DEMO_CHAPTERS).toHaveLength(3);
    for (const c of DEMO_CHAPTERS) expect(c.questions.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every question exactly one correct option and at least one hint', () => {
    for (const q of DEMO_CHAPTERS.flatMap((c) => c.questions)) {
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      expect(q.hints.length).toBeGreaterThan(0);
    }
  });

  it('matches the lesson section contract', () => {
    for (const s of DEMO_CHAPTERS.flatMap((c) => [...c.fullLesson, ...c.quickNotes])) {
      expect(LessonSectionSchema.safeParse(s).success).toBe(true);
    }
  });
});

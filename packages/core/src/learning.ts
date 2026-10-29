import type { ChapterStatus } from '@matriq/types';
import type {
  ChapterNode,
  ContinueStudying,
  Recommendation,
} from '@matriq/validation';

/** Raw per-chapter progress, as stored in `student_progress`. */
export interface ChapterProgressFacts {
  lessonRead: boolean;
  practised: boolean;
  completed: boolean;
}

export function deriveChapterStatus(facts: ChapterProgressFacts | undefined): ChapterStatus {
  if (!facts) return 'not_started';
  if (facts.completed) return 'completed';
  if (facts.practised) return 'practising';
  if (facts.lessonRead) return 'reading';
  return 'not_started';
}

/** The highlighted node on the learning path: the first unfinished chapter. */
export function currentChapter<T extends Pick<ChapterNode, 'status'>>(chapters: readonly T[]) {
  return chapters.find((c) => c.status !== 'completed') ?? null;
}

export function countCompleted(chapters: readonly Pick<ChapterNode, 'status'>[]): number {
  return chapters.filter((c) => c.status === 'completed').length;
}

/** The single "continue studying" card on the dashboard. */
export function continueStudying(
  chapters: readonly ChapterNode[],
  subjectName: string,
): ContinueStudying | null {
  const current = currentChapter(chapters);
  if (current) {
    return {
      chapter: { id: current.id, slug: current.slug, number: current.number, title: current.title },
      subjectName,
      status: current.status,
      action: current.status === 'not_started' ? 'read' : 'practice',
    };
  }
  // Everything is complete: suggest reviewing the weakest chapter.
  const weakest = [...chapters].sort((a, b) => (a.bestScore ?? 0) - (b.bestScore ?? 0))[0];
  if (!weakest) return null;
  return {
    chapter: { id: weakest.id, slug: weakest.slug, number: weakest.number, title: weakest.title },
    subjectName,
    status: weakest.status,
    action: 'review',
  };
}

export interface ChapterAccuracyFacts {
  attempts: number;
  correct: number;
}

/** A chapter counts as weak after enough attempts below this accuracy. */
export const WEAK_CHAPTER = { minAttempts: 3, maxAccuracy: 0.6 } as const;

/**
 * At most two calm suggestions. Never a feed, never guilt-based.
 */
export function recommend(input: {
  chapters: readonly ChapterNode[];
  chapterAccuracy: Readonly<Record<string, ChapterAccuracyFacts>>;
  continueChapterId: string | null;
  streakDays: number;
  studiedToday: boolean;
}): Recommendation[] {
  const { chapters, chapterAccuracy, continueChapterId } = input;
  const link = (c: ChapterNode) => ({ slug: c.slug, number: c.number, title: c.title });
  const out: Recommendation[] = [];

  for (const c of chapters) {
    const facts = chapterAccuracy[c.id];
    if (
      c.id !== continueChapterId &&
      facts &&
      facts.attempts >= WEAK_CHAPTER.minAttempts &&
      facts.correct / facts.attempts < WEAK_CHAPTER.maxAccuracy
    ) {
      out.push({
        id: `weak:${c.id}`,
        kind: 'revisit_weak_chapter',
        chapter: link(c),
        messageKey: 'rec.revisitWeak',
      });
      break;
    }
  }

  const continueIndex = chapters.findIndex((c) => c.id === continueChapterId);
  const following = continueIndex >= 0 ? chapters[continueIndex + 1] : undefined;
  if (following && following.status === 'not_started') {
    out.push({
      id: `start:${following.id}`,
      kind: 'start_chapter',
      chapter: link(following),
      messageKey: 'rec.startChapter',
    });
  }

  const toStrengthen = chapters.find(
    (c) => c.status === 'completed' && c.id !== continueChapterId && (c.bestScore ?? 0) < 100,
  );
  if (toStrengthen) {
    out.push({
      id: `practice:${toStrengthen.id}`,
      kind: 'practice_chapter',
      chapter: link(toStrengthen),
      messageKey: 'rec.practiceChapter',
    });
  }

  if (input.streakDays > 0 && !input.studiedToday) {
    out.push({ id: 'keep-streak', kind: 'keep_streak', chapter: null, messageKey: 'rec.keepStreak' });
  }

  return out.slice(0, 2);
}

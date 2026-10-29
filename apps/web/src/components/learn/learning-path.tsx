'use client';

import { PATH_NODE_ICONS } from '@matriq/ui';
import type { ChapterNode } from '@matriq/validation';
import { Check, Leaf } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { cn, pad2 } from '@/lib/utils';
import { PATH_ICONS } from '../icons';

export type PathNodeState = 'complete' | 'current' | 'idle';

export function nodeState(chapter: Pick<ChapterNode, 'id' | 'status'>, currentChapterId: string | null): PathNodeState {
  if (chapter.status === 'completed') return 'complete';
  if (chapter.id === currentChapterId) return 'current';
  return 'idle';
}

/** Geometry from the prototype map (360px wide, 104px between stops). */
const FIRST_TOP = 22;
const STEP = 104;
const NODE = 68;
const LEFT = [13, 64] as const;
const CENTER_Y = 45;

export function pathGeometry(count: number) {
  const centers = Array.from({ length: count }, (_, i) => ({
    x: LEFT[i % 2]! + NODE / 2,
    y: FIRST_TOP + STEP * i + CENTER_Y - 1,
  }));
  let d = '';
  const [first, second] = centers;
  if (first) d = `M${first.x} ${first.y}`;
  if (first && second) d += ` C${first.x} ${first.y + 50} ${second.x} ${second.y - 55} ${second.x} ${second.y}`;
  else if (first) d += ` L${first.x} ${first.y}`;
  for (const c of centers.slice(2)) d += ` S${c.x} ${c.y - 50} ${c.x} ${c.y}`;
  return { d, height: FIRST_TOP + STEP * count };
}

const nodeClasses: Record<PathNodeState, string> = {
  idle: 'bg-node-idle text-node-idle-ink shadow-ledge-node-idle',
  current:
    'bg-node-current text-paper shadow-[var(--mq-ledge-node-current),0_0_0_4px_var(--mq-node-current-ring)]',
  complete: 'bg-node-done text-node-done-ink shadow-ledge-node-done',
};

export function LearningPath({
  chapters,
  currentChapterId,
}: {
  chapters: ChapterNode[];
  currentChapterId: string | null;
}) {
  const { t } = useI18n();
  const { d, height } = pathGeometry(chapters.length);

  return (
    <ol className="relative -mx-[3px] max-w-[366px] list-none" style={{ height }} aria-label={t('chapters')}>
      <svg className="mq-trail pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <path d={d} />
        <path className="mq-trail-dashes" d={d} />
      </svg>
      {chapters.map((chapter, i) => {
        const state = nodeState(chapter, currentChapterId);
        const iconName = PATH_NODE_ICONS[i % PATH_NODE_ICONS.length]!;
        const Icon = state === 'complete' ? Check : (PATH_ICONS[iconName] ?? Check);
        const indented = i % 2 === 1;
        const status =
          state === 'complete'
            ? t('done')
            : state === 'current'
              ? `${chapter.status === 'practising' ? t('practiceNow') : t('read')} →`
              : t('toStart');
        return (
          <li
            key={chapter.id}
            className="absolute"
            style={{
              top: FIRST_TOP + STEP * i,
              left: LEFT[i % 2],
              width: `calc(100% - ${indented ? LEFT[1] + 9 : LEFT[0] * 2}px)`,
            }}
          >
            {i % 4 === 0 || i % 4 === 2 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute text-decoration',
                  i % 4 === 0 ? 'top-[61px] right-[-7px] rotate-16' : 'top-[62px] right-[2px] -rotate-12',
                )}
              >
                <Leaf className="size-[26px]" strokeWidth={1.9} />
              </span>
            ) : null}
            <Link
              href={`/learn/${chapter.slug}`}
              data-node-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className="group flex min-h-[90px] items-center gap-[17px] rounded-xl text-left"
            >
              <span
                className={cn(
                  'relative grid size-[68px] shrink-0 place-items-center rounded-node border-4 border-bg transition-transform duration-150 group-hover:-translate-y-[3px] group-active:translate-y-[3px]',
                  nodeClasses[state],
                )}
              >
                <Icon className="size-[27px]" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="block max-w-[220px] min-w-0">
                <small className="text-[10px] font-extrabold tracking-[0.7px] text-label-ink uppercase">
                  {t('chapter')} {pad2(chapter.number)}
                </small>
                <strong
                  lang="en"
                  className={cn(
                    'my-[3px] block text-[15px] leading-[1.3] font-bold tracking-[-0.25px]',
                    state === 'current' ? 'text-ink' : 'text-node-label',
                  )}
                >
                  {chapter.title}
                </strong>
                <em
                  className={cn(
                    'text-caption not-italic',
                    state === 'current' ? 'font-extrabold text-green-dark' : 'font-normal text-muted',
                  )}
                >
                  {status}
                </em>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

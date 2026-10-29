import type { ChapterNode } from '@matriq/validation';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LearningPath, nodeState, pathGeometry } from './learning-path';

const node = (n: number, status: ChapterNode['status']): ChapterNode => ({
  id: `00000000-0000-4000-8000-06000000000${n}`,
  slug: `chapter-${n}`,
  number: n,
  title: `Chapter title ${n}`,
  tagline: 'Tagline',
  unitTitle: 'Unit',
  status,
  questionCount: 3,
  bestScore: null,
});

describe('nodeState', () => {
  it('marks completed, current and idle nodes', () => {
    const current = node(2, 'reading');
    expect(nodeState(node(1, 'completed'), current.id)).toBe('complete');
    expect(nodeState(current, current.id)).toBe('current');
    expect(nodeState(node(3, 'not_started'), current.id)).toBe('idle');
  });

  it('keeps a completed chapter complete even if it is the current id', () => {
    const done = node(1, 'completed');
    expect(nodeState(done, done.id)).toBe('complete');
  });
});

describe('pathGeometry', () => {
  it('matches the prototype trail for four stops', () => {
    const { d, height } = pathGeometry(4);
    expect(d).toBe('M47 66 C47 116 98 115 98 170 S47 224 47 274 S98 328 98 378');
    expect(height).toBe(438);
  });

  it('handles a single chapter', () => {
    expect(pathGeometry(1).d).toBe('M47 66 L47 66');
  });
});

describe('<LearningPath>', () => {
  it('renders each node with its state, status line and link', () => {
    const chapters = [node(1, 'completed'), node(2, 'not_started'), node(3, 'not_started')];
    renderWithProviders(<LearningPath chapters={chapters} currentChapterId={chapters[1]!.id} />);

    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('data-node-state'))).toEqual(['complete', 'current', 'idle']);
    expect(links[0]).toHaveTextContent('Completed');
    expect(links[1]).toHaveTextContent('Read chapter →');
    expect(links[1]).toHaveAttribute('aria-current', 'step');
    expect(links[2]).toHaveTextContent('Up next');
    expect(links[1]).toHaveAttribute('href', '/learn/chapter-2');
    expect(screen.getByText('Chapter title 2')).toHaveAttribute('lang', 'en');
    expect(screen.getByText(/CHAPTER 02|Chapter 02/)).toBeInTheDocument();
  });

  it('translates the interface but not the chapter titles', () => {
    const chapters = [node(1, 'not_started')];
    renderWithProviders(<LearningPath chapters={chapters} currentChapterId={chapters[0]!.id} />, { language: 'am' });
    expect(screen.getByRole('link')).toHaveTextContent('ምዕራፉን አንብብ');
    expect(screen.getByText('Chapter title 1')).toBeInTheDocument();
  });
});

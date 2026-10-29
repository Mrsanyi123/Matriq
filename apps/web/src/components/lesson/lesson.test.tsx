import { DEMO_CHAPTERS } from '@matriq/demo-content';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { plotPoints } from './function-plot';
import { LessonArticle } from './lesson-article';

const chapter = DEMO_CHAPTERS[0]!;

describe('plotPoints', () => {
  it('scales points into the plot area, rising left to right', () => {
    const pts = plotPoints([
      [0, 1],
      [3, 7],
    ]);
    expect(pts[0]).toMatchObject({ px: 36, py: 150 });
    expect(pts[1]).toMatchObject({ px: 236, py: 30 });
  });
});

describe('<LessonArticle>', () => {
  it('renders numbered sections, the function plot and the worked example', () => {
    renderWithProviders(<LessonArticle sections={chapter.fullLesson} mode="full" />);
    expect(screen.getByRole('heading', { name: /01\s*The main idea/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /05\s*Before you continue/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Line graph of f(x) = 2x + 1' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByText('WORKED EXAMPLE')).toBeInTheDocument();
    expect(screen.getByText(/f\(3\) = 2\(3\) \+ 1 = 7/)).toHaveAttribute('lang', 'en');
  });

  it('renders quick notes as key-note cards', () => {
    renderWithProviders(<LessonArticle sections={chapter.quickNotes} mode="notes" />, { language: 'am' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ማስታወስ ያለብህ');
    expect(screen.getByText(chapter.quickNotes[0]!.body).closest('[lang="en"]')).not.toBeNull();
  });
});

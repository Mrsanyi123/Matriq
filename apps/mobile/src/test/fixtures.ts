import type { ChapterNode, Dashboard } from '@matriq/validation';

export const chapterIds = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
] as const;

export const chapters: ChapterNode[] = [
  {
    id: chapterIds[0],
    slug: 'functions-and-graphs',
    number: 1,
    title: 'Functions & graphs',
    tagline: 'Start by seeing the pattern.',
    unitTitle: 'Functions and limits',
    status: 'completed',
    questionCount: 3,
    bestScore: 67,
  },
  {
    id: chapterIds[1],
    slug: 'limits-and-continuity',
    number: 2,
    title: 'Limits & continuity',
    tagline: 'Get close.',
    unitTitle: 'Functions and limits',
    status: 'reading',
    questionCount: 3,
    bestScore: null,
  },
  {
    id: chapterIds[2],
    slug: 'derivatives',
    number: 3,
    title: 'Derivatives',
    tagline: 'Rates of change.',
    unitTitle: 'Introduction to calculus',
    status: 'not_started',
    questionCount: 3,
    bestScore: null,
  },
];

const week = ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map(
  (date, i) => ({ date, active: i >= 5, isToday: i === 6 }),
);

export const dashboardFixture: Dashboard = {
  displayName: 'Selam',
  gradeLevel: 12,
  subject: { slug: 'mathematics', name: 'Mathematics', iconKey: 'function' },
  today: { date: '2026-10-29', minutes: 12, goalMinutes: 20, goalMet: false },
  stats: {
    streakDays: 2,
    xpTotal: 140,
    chaptersCompleted: 1,
    chaptersTotal: 3,
    questionsAnswered: 9,
    correctAnswers: 6,
    accuracy: 67,
  },
  week,
  continueStudying: {
    chapter: { id: chapterIds[1], slug: 'limits-and-continuity', number: 2, title: 'Limits & continuity' },
    subjectName: 'Mathematics',
    status: 'reading',
    action: 'practice',
  },
  nextReminder: null,
  recommendations: [
    {
      id: 'start:derivatives',
      kind: 'start_chapter',
      chapter: { slug: 'derivatives', number: 3, title: 'Derivatives' },
      messageKey: 'rec.startChapter',
    },
  ],
  isDemo: true,
};

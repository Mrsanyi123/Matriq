/**
 * Pilot course: Grade 12 Mathematics, three chapters.
 *
 * DEMO CONTENT. Lesson text is adapted from the Matriq design prototype and
 * was written for illustration. It is NOT official EUEE material, NOT taken
 * from an official textbook, and every question is an original practice item
 * (origin `original_practice`), never a past-exam question. Real content must
 * enter through the content pipeline (docs/CONTENT_PIPELINE.md).
 */
import type { LessonSectionKind, RevisionCardKind } from '@matriq/types';
import type { FunctionPlotData } from '@matriq/validation';
import { demoId } from './ids';

export interface DemoSection {
  id: string;
  kind: LessonSectionKind;
  heading: string | null;
  body: string;
  data: FunctionPlotData | null;
}

export interface DemoOption {
  id: string;
  label: string;
  body: string;
  isCorrect: boolean;
}

export interface DemoQuestion {
  id: string;
  prompt: string;
  options: DemoOption[];
  hints: string[];
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export interface DemoRevisionCard {
  id: string;
  kind: RevisionCardKind;
  front: string;
  back: string;
}

export interface DemoChapter {
  id: string;
  slug: string;
  number: number;
  unitId: string;
  title: string;
  tagline: string;
  objectives: string[];
  fullLessonId: string;
  quickNotesId: string;
  fullLesson: DemoSection[];
  quickNotes: DemoSection[];
  questions: DemoQuestion[];
  revisionCards: DemoRevisionCard[];
}

export interface DemoUnit {
  id: string;
  number: number;
  title: string;
}

// Sequential ID allocation keeps IDs stable as long as order is unchanged.
let sectionSeq = 0;
let questionSeq = 0;
let optionSeq = 0;
let cardSeq = 0;

const FULL_LESSON_HEADINGS = [
  'The main idea',
  'How it works',
  'Look a little closer',
  'Try it yourself',
  'Before you continue',
];

function section(
  kind: LessonSectionKind,
  heading: string | null,
  body: string,
  data: FunctionPlotData | null = null,
): DemoSection {
  return { id: demoId('section', ++sectionSeq), kind, heading, body, data };
}

function fullLesson(paragraphs: string[], workedExample: string, extra: DemoSection[] = []) {
  return [
    ...paragraphs.map((p, i) => section('text', FULL_LESSON_HEADINGS[i] ?? 'Keep learning', p)),
    ...extra,
    section('worked_example', 'Worked example', workedExample),
  ];
}

function quickNotes(points: string[], workedExample: string) {
  return [
    ...points.map((p) => section('key_point', null, p)),
    section('worked_example', 'Worked example', workedExample),
  ];
}

function question(
  prompt: string,
  options: string[],
  correct: number,
  hints: string[],
  explanation: string,
  difficulty: 1 | 2 | 3 = 1,
): DemoQuestion {
  return {
    id: demoId('question', ++questionSeq),
    prompt,
    options: options.map((body, i) => ({
      id: demoId('option', ++optionSeq),
      label: 'ABCD'[i] ?? String(i + 1),
      body,
      isCorrect: i === correct,
    })),
    hints,
    explanation,
    difficulty,
  };
}

function card(kind: RevisionCardKind, front: string, back: string): DemoRevisionCard {
  return { id: demoId('card', ++cardSeq), kind, front, back };
}

export const DEMO_SOURCE = {
  id: demoId('source', 1),
  title: 'Matriq demo content',
  kind: 'original' as const,
  publisher: 'Matriq',
  license: 'Matriq original. Demo only. Not for publication as authoritative material.',
  attribution: 'Written by the Matriq team for the design prototype.',
};

export const DEMO_EDITION = {
  id: demoId('edition', 1),
  name: 'Matriq pilot (demo curriculum)',
  subjectSlug: 'mathematics',
  gradeLevel: 12 as const,
  stream: null,
};

export const DEMO_UNITS: readonly DemoUnit[] = [
  { id: demoId('unit', 1), number: 1, title: 'Functions and limits' },
  { id: demoId('unit', 2), number: 2, title: 'Introduction to calculus' },
];

const unit1 = DEMO_UNITS[0]!.id;
const unit2 = DEMO_UNITS[1]!.id;

export const DEMO_CHAPTERS: readonly DemoChapter[] = [
  {
    id: demoId('chapter', 1),
    slug: 'functions-and-graphs',
    number: 1,
    unitId: unit1,
    title: 'Functions & graphs',
    tagline: 'Start by seeing the pattern.',
    objectives: [
      'Explain what makes a rule a function.',
      'Find the domain of simple functions.',
      'Read inputs and outputs from a graph or table.',
    ],
    fullLessonId: demoId('lesson', 1),
    quickNotesId: demoId('lesson', 2),
    fullLesson: fullLesson(
      [
        'A function is a machine: give it one input and it produces one output. For example, the rule f(x) = 2x + 1 doubles the input then adds one.',
        'To read a graph, look at the horizontal axis for inputs and the vertical axis for outputs. Each point (x, y) shows the input and its output.',
        'A value is only in the domain if the rule is defined there. For example, f(x) = 1/x cannot take x = 0, since division by zero is not allowed.',
        'Make a small table before drawing a graph: for f(x) = 2x + 1, the input values 0, 1 and 2 produce 1, 3 and 5. Plot the points and connect them with a straight line.',
        'Check your understanding: how would the table change if the rule were f(x) = 2x - 1? Compare the two graphs. They have the same steepness, but different vertical intercepts.',
      ],
      'f(x) = 2x + 1. When x = 3, f(3) = 2(3) + 1 = 7.',
      [
        section('diagram', 'Look at the rule: f(x) = 2x + 1', 'Each row of the table gives one point on the line.', {
          type: 'function_plot',
          rule: 'f(x) = 2x + 1',
          points: [
            [0, 1],
            [1, 3],
            [2, 5],
            [3, 7],
          ],
          caption: 'Each row gives one point on the line.',
        }),
      ],
    ),
    quickNotes: quickNotes(
      [
        'A function gives one output for every permitted input.',
        'The domain is the set of valid inputs; the range is the set of outputs.',
        'A graph shows how output changes when input changes.',
      ],
      'f(x) = 2x + 1. When x = 3, f(3) = 7.',
    ),
    questions: [
      question(
        'If f(x) = 3x + 2, what is f(2)?',
        ['5', '6', '8', '10'],
        2,
        ['Replace x with 2 in the rule.', 'Multiply 3 × 2 before adding 2.'],
        'f(2) = 3(2) + 2 = 8.',
      ),
      question(
        'For f(x) = x², what is f(-3)?',
        ['-9', '-6', '6', '9'],
        3,
        ['Substitute -3 carefully.', 'A negative number squared becomes positive.'],
        '(-3)² = 9.',
      ),
      question(
        'Which set lists the possible inputs of a function?',
        ['Range', 'Domain', 'Intercept', 'Gradient'],
        1,
        ['Think: input comes first.', 'The word for possible x-values is domain.'],
        'The domain is the set of values that can be used as inputs.',
      ),
    ],
    revisionCards: [
      card('concept', 'What makes a rule a function?', 'Every permitted input gives exactly one output.'),
      card('flashcard', 'Domain vs range', 'Domain: valid inputs. Range: the outputs produced.'),
      card('true_false', 'True or false: x = 0 is in the domain of f(x) = 1/x.', 'False. Division by zero is not allowed.'),
    ],
  },
  {
    id: demoId('chapter', 2),
    slug: 'limits-and-continuity',
    number: 2,
    unitId: unit1,
    title: 'Limits & continuity',
    tagline: 'What happens as you get closer?',
    objectives: [
      'Describe a limit in your own words.',
      'Evaluate limits of polynomials by substitution.',
      'State the three conditions for continuity at a point.',
    ],
    fullLessonId: demoId('lesson', 3),
    quickNotesId: demoId('lesson', 4),
    fullLesson: fullLesson(
      [
        'Imagine walking toward a door. A limit asks where you are heading as you approach it—not necessarily what happens at the exact door.',
        'For polynomials, you can usually find a limit by substituting the target value. For expressions with 0/0, first simplify or factor if valid.',
        'Continuity means there is no break at the point: the function is defined, the limit exists, and the two values match.',
      ],
      'lim (x → 2) (x + 3) = 2 + 3 = 5.',
    ),
    quickNotes: quickNotes(
      [
        'A limit describes the value a function approaches near an input.',
        'The function does not always need to equal the limit at that point.',
        'A function is continuous when its value and its limit agree.',
      ],
      'lim (x → 2) (x + 3) = 5.',
    ),
    questions: [
      question(
        'Find lim (x → 3) (2x + 1).',
        ['5', '6', '7', '8'],
        2,
        ['This function is continuous, so substitute x = 3.', 'Calculate 2(3) + 1.'],
        'The limit is 7.',
      ),
      question(
        'Find lim (x → 2) x².',
        ['2', '3', '4', '8'],
        2,
        ['For x², direct substitution works.', 'Square 2.'],
        '2² = 4.',
      ),
      question(
        'If f is continuous at x = a, which is true?',
        ['Its limit must be 0', 'The limit equals f(a)', 'It has no graph', 'The function is undefined'],
        1,
        ['Continuity means no jump or hole at that point.'],
        'Continuity requires lim(x→a) f(x) = f(a).',
        2,
      ),
    ],
    revisionCards: [
      card('concept', 'What does a limit describe?', 'The value a function approaches as the input gets close to a point.'),
      card('formula', 'Continuity at x = a', 'lim(x→a) f(x) = f(a), with both sides defined.'),
      card('true_false', 'True or false: a function must equal its limit at every point.', 'False. A function can have a hole where the limit still exists.'),
    ],
  },
  {
    id: demoId('chapter', 3),
    slug: 'derivatives',
    number: 3,
    unitId: unit2,
    title: 'Derivatives',
    tagline: 'Measure how fast things change.',
    objectives: [
      'Interpret a derivative as a rate of change.',
      'Apply the power rule to polynomial terms.',
      'Explain why the derivative of a constant is zero.',
    ],
    fullLessonId: demoId('lesson', 5),
    quickNotesId: demoId('lesson', 6),
    fullLesson: fullLesson(
      [
        'The slope of a curve at a point tells you how quickly its y-value is changing there.',
        'Use the power rule on each polynomial term: multiply by the exponent, then reduce the exponent by one.',
        'A constant such as 7 has derivative 0, because it does not change with x.',
      ],
      'd/dx (x³ + 2x) = 3x² + 2.',
    ),
    quickNotes: quickNotes(
      [
        'A derivative measures the instantaneous rate of change.',
        'The power rule is d/dx (xⁿ) = nxⁿ⁻¹.',
        'Differentiate each term of a polynomial separately.',
      ],
      'd/dx (x³ + 2x) = 3x² + 2.',
    ),
    questions: [
      question(
        'Differentiate x².',
        ['x', '2x', 'x³', '2'],
        1,
        ['Use the power rule.', 'Bring the exponent down and reduce it by one.'],
        'd/dx(x²) = 2x.',
      ),
      question(
        'Differentiate 5x.',
        ['5', 'x', '0', '5x²'],
        0,
        ['The slope of ax is a.'],
        'd/dx(5x) = 5.',
      ),
      question(
        'Differentiate x³ + x.',
        ['3x + 1', 'x²', '3x² + 1', '4x'],
        2,
        ['Differentiate terms separately.'],
        'd/dx(x³ + x) = 3x² + 1.',
        2,
      ),
    ],
    revisionCards: [
      card('formula', 'Power rule', 'd/dx (xⁿ) = n·xⁿ⁻¹'),
      card('concept', 'What does a derivative measure?', 'The instantaneous rate of change: the slope of the curve at a point.'),
      card('multiple_choice', 'd/dx (7) = ?', '0. A constant does not change with x.'),
    ],
  },
];

/** Notice shown wherever demo content appears. */
export const DEMO_NOTICE =
  'Sample content. Not official exam material.';

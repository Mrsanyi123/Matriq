import type { GradeLevel, Stream, TargetExam } from '@matriq/types';
import { demoId } from './ids';

/** Reference data (not demo content): grades, streams, subjects, exams. */

export const GRADES: readonly { id: string; level: GradeLevel }[] = [9, 10, 11, 12].map(
  (level, i) => ({ id: demoId('grade', i + 1), level: level as GradeLevel }),
);

export const STREAMS_CATALOG: readonly { id: string; slug: Stream; name: string }[] = [
  { id: demoId('stream', 1), slug: 'natural_science', name: 'Natural science' },
  { id: demoId('stream', 2), slug: 'social_science', name: 'Social science' },
];

export const TARGET_EXAM_CATALOG: readonly { slug: TargetExam; name: string }[] = [
  { slug: 'euee', name: 'University entrance exam (EUEE)' },
  { slug: 'school_exams', name: 'School exams' },
  { slug: 'general_study', name: 'General study' },
];

export interface SubjectRecord {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  gradeLevels: GradeLevel[];
  /** Empty means common to every stream. */
  streams: Stream[];
}

const ALL_GRADES: GradeLevel[] = [9, 10, 11, 12];

export const SUBJECTS: readonly SubjectRecord[] = [
  { slug: 'mathematics', name: 'Mathematics', iconKey: 'function', streams: [] },
  { slug: 'english', name: 'English', iconKey: 'languages', streams: [] },
  { slug: 'physics', name: 'Physics', iconKey: 'zap', streams: ['natural_science'] },
  { slug: 'chemistry', name: 'Chemistry', iconKey: 'flask', streams: ['natural_science'] },
  { slug: 'biology', name: 'Biology', iconKey: 'leaf', streams: ['natural_science'] },
  { slug: 'geography', name: 'Geography', iconKey: 'globe', streams: ['social_science'] },
  { slug: 'history', name: 'History', iconKey: 'landmark', streams: ['social_science'] },
  { slug: 'economics', name: 'Economics', iconKey: 'chart-line', streams: ['social_science'] },
].map((s, i) => ({ ...s, id: demoId('subject', i + 1), gradeLevels: ALL_GRADES }) as SubjectRecord);

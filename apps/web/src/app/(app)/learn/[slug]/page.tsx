import type { Metadata } from 'next';
import { LessonScreen } from './lesson-screen';

export const metadata: Metadata = { title: 'Read' };

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LessonScreen slug={slug} />;
}

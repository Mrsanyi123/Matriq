import type { Metadata } from 'next';
import { PracticeScreen } from './practice-screen';

export const metadata: Metadata = { title: 'Practice' };

export default async function ChapterPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PracticeScreen slug={slug} />;
}

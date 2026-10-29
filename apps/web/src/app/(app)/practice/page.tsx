import type { Metadata } from 'next';
import { PracticeListScreen } from './practice-list-screen';

export const metadata: Metadata = { title: 'Practice' };

export default function PracticePage() {
  return <PracticeListScreen />;
}

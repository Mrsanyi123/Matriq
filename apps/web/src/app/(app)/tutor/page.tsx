import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'AI Tutor' };

export default function TutorPage() {
  return <ComingSoon navKey="tutor" />;
}

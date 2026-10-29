import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Study Planner' };

export default function PlannerPage() {
  return <ComingSoon navKey="planner" />;
}

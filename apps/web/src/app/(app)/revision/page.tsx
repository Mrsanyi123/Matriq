import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Revision' };

export default function RevisionPage() {
  return <ComingSoon navKey="revision" />;
}

import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Library' };

export default function LibraryPage() {
  return <ComingSoon navKey="library" />;
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MODE_COOKIE } from '@/lib/cookies';

/** The proxy normally redirects `/`; this is the fallback. */
export default async function RootPage() {
  const store = await cookies();
  redirect(store.get(MODE_COOKIE)?.value === 'demo' ? '/home' : '/welcome');
}

import { cookies } from 'next/headers';
import { AppShell } from '@/components/shell/app-shell';
import { SIDEBAR_COOKIE } from '@/lib/cookies';

/** Signed-in and demo screens share the app shell (sidebar, top bar, tabs). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const collapsed = store.get(SIDEBAR_COOKIE)?.value === 'collapsed';
  return <AppShell initialCollapsed={collapsed}>{children}</AppShell>;
}

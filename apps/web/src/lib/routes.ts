/** Routes that need a signed-in student or the demo. */
export const PROTECTED_PREFIXES = [
  '/home',
  '/learn',
  '/practice',
  '/progress',
  '/settings',
  '/profile',
  '/revision',
  '/library',
  '/tutor',
  '/planner',
  '/onboarding',
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Where the proxy sends a request, or null to continue. Pure for testing.
 */
export function routeDecision(
  pathname: string,
  session: { signedIn: boolean; demo: boolean },
): string | null {
  const allowed = session.signedIn || session.demo;
  if (pathname === '/') return allowed ? '/home' : '/welcome';
  if (isProtectedPath(pathname) && !allowed) return '/welcome';
  if (pathname === '/welcome' && session.signedIn && !session.demo) return '/home';
  return null;
}

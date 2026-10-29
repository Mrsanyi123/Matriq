import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { MODE_COOKIE } from './lib/cookies';
import { isSupabaseConfigured, supabaseEnv } from './lib/env';
import { routeDecision } from './lib/routes';

/**
 * Next.js 16 "proxy" (formerly middleware): refreshes the Supabase session
 * cookie on every request and keeps app routes for signed-in students or the
 * demo (`matriq_mode=demo` cookie).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isSupabaseConfigured) {
    const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    try {
      // Verifies the JWT (and refreshes an expiring session via setAll).
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims?.sub);
    } catch {
      signedIn = false;
    }
  }

  const demo = request.cookies.get(MODE_COOKIE)?.value === 'demo';
  const target = routeDecision(request.nextUrl.pathname, { signedIn, demo });
  if (!target) return response;

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = '';
  const redirect = NextResponse.redirect(url);
  // Keep any refreshed auth cookies on the redirect.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)'],
};

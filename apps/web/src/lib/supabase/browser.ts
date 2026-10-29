'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseEnv } from '../env';

let client: SupabaseClient | null = null;

/** Cookie-backed browser client (shared with the proxy), or null when not configured. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
  return client;
}

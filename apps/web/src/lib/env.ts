/**
 * Public Supabase settings. `NEXT_PUBLIC_*` values are inlined at build time,
 * so they must be referenced literally. Both are public: Row Level Security
 * protects the data.
 */
export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

/** False on builds without Supabase settings: only the demo is offered. */
export const isSupabaseConfigured = Boolean(supabaseEnv.url && supabaseEnv.anonKey);

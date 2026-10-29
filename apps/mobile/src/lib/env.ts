/**
 * Public build-time configuration. Expo inlines `EXPO_PUBLIC_*` variables
 * only when they are read with a static `process.env.NAME` expression.
 */
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

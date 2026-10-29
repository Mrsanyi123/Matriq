import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './env';
import { createChunkedSecureStorage } from './secure-session-storage';

let client: SupabaseClient | null | undefined;

/**
 * The Supabase client, or null when this build has no Supabase configuration
 * (the app then offers only the demo). Sessions are kept in SecureStore on
 * devices; the web build (used only as a verification aid) uses localStorage.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured) {
    client = null;
    return client;
  }
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === 'web' ? AsyncStorage : createChunkedSecureStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

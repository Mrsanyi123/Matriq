import * as SecureStore from 'expo-secure-store';

/**
 * Supabase session storage on the Android Keystore / iOS Keychain.
 *
 * SecureStore values should stay under ~2 KB, and a Supabase session (access
 * + refresh token + user) is larger, so values are split into chunks:
 * `<key>.n` holds the chunk count, `<key>.0 … <key>.n-1` the parts.
 */
const CHUNK_SIZE = 1800;

/** SecureStore keys may only contain alphanumerics, ".", "-" and "_". */
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createChunkedSecureStorage(store: Pick<
  typeof SecureStore,
  'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'
> = SecureStore): SessionStorage {
  async function count(key: string): Promise<number> {
    const raw = await store.getItemAsync(`${safeKey(key)}.n`);
    const n = raw === null ? 0 : Number(raw);
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  async function removeItem(key: string) {
    const n = await count(key);
    for (let i = 0; i < n; i += 1) await store.deleteItemAsync(`${safeKey(key)}.${i}`);
    await store.deleteItemAsync(`${safeKey(key)}.n`);
  }

  return {
    async getItem(key) {
      const n = await count(key);
      if (n === 0) return null;
      let value = '';
      for (let i = 0; i < n; i += 1) {
        const part = await store.getItemAsync(`${safeKey(key)}.${i}`);
        if (part === null) return null;
        value += part;
      }
      return value;
    },
    async setItem(key, value) {
      await removeItem(key);
      const parts = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let i = 0; i < parts; i += 1) {
        await store.setItemAsync(
          `${safeKey(key)}.${i}`,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        );
      }
      await store.setItemAsync(`${safeKey(key)}.n`, String(parts));
    },
    removeItem,
  };
}

/**
 * Minimal async key-value storage. Web passes a `localStorage` adapter;
 * mobile passes AsyncStorage (which already matches this shape).
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** In-memory storage for tests and server rendering. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

/**
 * Wraps a synchronous Web Storage object (e.g. `window.localStorage`). Access
 * can throw in private browsing, so failures degrade to memory-only.
 */
export function createWebStorage(getStorage: () => Storage | undefined): KeyValueStorage {
  const fallback = createMemoryStorage();
  const safe = <T>(fn: (s: Storage) => T, onError: () => T | Promise<T>) => {
    try {
      const storage = getStorage();
      return storage ? Promise.resolve(fn(storage)) : Promise.resolve(onError());
    } catch {
      return Promise.resolve(onError());
    }
  };
  return {
    getItem: (key) => safe((s) => s.getItem(key), () => fallback.getItem(key)),
    setItem: (key, value) => safe((s) => s.setItem(key, value), () => fallback.setItem(key, value)),
    removeItem: (key) => safe((s) => s.removeItem(key), () => fallback.removeItem(key)),
  };
}

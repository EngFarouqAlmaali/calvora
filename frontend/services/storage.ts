/**
 * Minimal key-value storage contract, satisfied by the browser's `Storage`.
 * Stores depend on this interface rather than on `localStorage` directly, so
 * persistence can be tested without a browser and degrades safely when
 * storage is blocked.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** In-memory fallback used when `localStorage` is unavailable. */
export function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

/**
 * Return `localStorage` if it is usable, otherwise an in-memory substitute.
 * Access can throw (blocked cookies, private modes) or writes can fail
 * (quota), so usability is proven with a real write.
 */
export function getBrowserStorage(): KeyValueStorage {
  try {
    const storage = globalThis.localStorage
    const probe = '__calvora_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return createMemoryStorage()
  }
}

/** Read and parse JSON; returns `undefined` for a missing or corrupt value. */
export function readJson(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

/** Serialise and write JSON. Returns `false` if the write failed. */
export function writeJson(storage: KeyValueStorage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

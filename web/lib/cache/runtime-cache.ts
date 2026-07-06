import "server-only";

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

const globalForRuntimeCache = globalThis as unknown as {
  runtimeCache?: Map<string, CacheEntry<unknown>>;
};

const runtimeCache = globalForRuntimeCache.runtimeCache ?? new Map<string, CacheEntry<unknown>>();
globalForRuntimeCache.runtimeCache = runtimeCache;

export async function getRuntimeCached<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  const now = Date.now();
  const existing = runtimeCache.get(key) as CacheEntry<T> | undefined;

  if (existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const promise = loader()
    .then((value) => {
      runtimeCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      return value;
    })
    .catch((error) => {
      runtimeCache.delete(key);
      throw error;
    });

  runtimeCache.set(key, {
    promise,
    expiresAt: now + ttlMs
  });

  return promise;
}

export function clearRuntimeCache(prefix?: string) {
  if (!prefix) {
    runtimeCache.clear();
    return;
  }

  for (const key of runtimeCache.keys()) {
    if (key.startsWith(prefix)) {
      runtimeCache.delete(key);
    }
  }
}

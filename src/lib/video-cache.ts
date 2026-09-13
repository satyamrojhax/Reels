/**
 * video-cache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dual-layer cache for reel feed API responses (the "Redis" for the browser):
 *
 *  L1  In-memory Map  — zero-latency lookup within the same page session.
 *  L2  IndexedDB      — persists warm data across refreshes with a TTL.
 *
 * Usage
 * ─────
 *   import { videoCache } from "@/lib/video-cache";
 *
 *   const cached = await videoCache.get("all::page1");
 *   if (cached) return cached;
 *
 *   const fresh = await fetchFromApi();
 *   await videoCache.set("all::page1", fresh);
 *   return fresh;
 */

const DB_NAME = "reels-cache-db";
const STORE = "api-responses";
const DB_VERSION = 1;
/** Default TTL: 60 minutes */
const DEFAULT_TTL_MS = 60 * 60 * 1_000;
/** Maximum entries kept in the memory L1 cache per session */
const MAX_MEMORY_ENTRIES = 40;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// ─── L1: In-Memory Cache ──────────────────────────────────────────────────────

class MemoryCache<T> {
  private map = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    // Evict oldest entry if at capacity
    if (this.map.size >= MAX_MEMORY_ENTRIES) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.map.clear();
  }
}

// ─── L2: IndexedDB Cache ──────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const record = req.result as ({ key: string } & CacheEntry<T>) | undefined;
        if (!record) return resolve(null);
        if (Date.now() > record.expiresAt) {
          // Stale — delete asynchronously, return null
          idbDelete(key).catch(() => {});
          return resolve(null);
        }
        resolve(record.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const entry = { key, data, expiresAt: Date.now() + ttlMs };
      const req = tx.objectStore(STORE).put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB may be unavailable in some private-browsing modes — ignore.
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// ─── Unified Cache API ────────────────────────────────────────────────────────

class VideoCache {
  private l1 = new MemoryCache<unknown>();

  /**
   * Look up a key.  Returns cached data if it exists and hasn't expired,
   * otherwise returns null.  Checks L1 first (sync), then L2 (async).
   */
  async get<T>(key: string): Promise<T | null> {
    // L1 — synchronous, zero latency
    const mem = this.l1.get(key) as T | null;
    if (mem !== null) return mem;

    // L2 — IndexedDB
    const idb = await idbGet<T>(key);
    if (idb !== null) {
      // Warm L1 so subsequent calls are instant
      this.l1.set(key, idb);
    }
    return idb;
  }

  /**
   * Store data in both L1 (memory) and L2 (IndexedDB).
   */
  async set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    this.l1.set(key, data, ttlMs);
    // Fire-and-forget to not block the caller
    idbSet(key, data, ttlMs).catch(() => {});
  }

  /**
   * Synchronous L1-only check — useful in render-critical paths.
   */
  getSync<T>(key: string): T | null {
    return this.l1.get(key) as T | null;
  }

  /**
   * Pre-warm the memory cache from IndexedDB for a list of keys.
   * Call this at app start to make the first render feel instant.
   */
  async warmup(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        if (this.l1.has(key)) return;
        const val = await idbGet(key);
        if (val !== null) this.l1.set(key, val);
      }),
    );
  }

  clearMemory(): void {
    this.l1.clear();
  }
}

export const videoCache = new VideoCache();

/**
 * Warm the most likely-needed cache keys on app init.
 * Called once from the router root.
 */
export async function warmCacheOnStartup(): Promise<void> {
  const filters = ["all", "recommended", "local", "trending"];
  const keys = filters.flatMap((f) => [1, 2, 3].map((p) => `${f}::page${p}`));
  await videoCache.warmup(keys);
}

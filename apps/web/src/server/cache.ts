import { env } from "cloudflare:workers";

/**
 * Bump when a cached payload's shape changes so old entries are ignored rather
 * than deserialized into the wrong shape.
 */
const CACHE_VERSION = "v4";

/** TTLs in seconds, named so call sites read intent instead of magic numbers. */
export const TTL = {
  hour: 60 * 60,
  day: 60 * 60 * 24,
  week: 60 * 60 * 24 * 7,
} as const;

/**
 * Options controlling how a freshly fetched value is persisted.
 *
 * `isDegraded` lets a `fetchFn` flag a result that is missing data because a
 * sub-fetch failed (e.g. OMDB was briefly down or rate-limited). A degraded
 * result is cached under `degradedTtlSeconds` instead of the normal TTL, so a
 * partial payload is not frozen for the full window: it expires quickly and the
 * next visitor re-fetches once upstream recovers. The short TTL still keeps us
 * from hammering the upstream during an outage.
 */
export interface CacheOptions<T> {
  isDegraded?: (value: T) => boolean;
  degradedTtlSeconds?: number;
}

/**
 * Read-through cache backed by the `CACHE` KV namespace. On a hit the
 * stored JSON is returned and `fetchFn` never runs; on a miss `fetchFn` runs
 * and its result is stored under `ttlSeconds`. This is what keeps us under the
 * OMDB daily rate limit: an upstream result is fetched once per key per TTL
 * window, no matter how many page views hit it.
 *
 * KV is strictly best-effort. If the binding is absent (a context without KV
 * configured) it calls `fetchFn` directly. And if a KV operation *throws* (most
 * likely the free-tier daily limit, or a transient KV fault), the failure is
 * logged and swallowed rather than propagated: a read failure falls through to
 * `fetchFn`, and a write failure still returns the freshly fetched value. The
 * request always succeeds as long as `fetchFn` does, just without the cache
 * benefit, so a KV outage can never take the whole page down with a 500.
 */
export const cached = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
  options: CacheOptions<T> = {},
): Promise<T> => {
  const kv = env.CACHE as KVNamespace | undefined;
  const namespacedKey = `${CACHE_VERSION}:${key}`;

  if (kv) {
    try {
      const hit = await kv.get<T>(namespacedKey, "json");
      if (hit !== null) return hit;
    } catch (error) {
      // A read failure must not break the request: fall through and fetch the
      // value directly. Logged at warn (not error) because it is handled, and
      // distinct from an `upstream fetch failed`.
      console.warn("cache read failed", { key: namespacedKey }, error);
    }
  }

  const value = await fetchFn();

  if (kv) {
    const degraded = options.isDegraded?.(value) ?? false;
    const effectiveTtl = degraded ? (options.degradedTtlSeconds ?? TTL.hour) : ttlSeconds;
    if (degraded) {
      // A sub-fetch failed, so we are persisting a partial payload under a short
      // TTL. The underlying failure is logged at the fetch site; this records
      // that the degraded result was cached, and for how long, so the recovery
      // window is visible in Workers Logs.
      console.info("caching degraded payload", { key: namespacedKey, ttlSeconds: effectiveTtl });
    }
    try {
      await kv.put(namespacedKey, JSON.stringify(value), {
        expirationTtl: effectiveTtl,
      });
    } catch (error) {
      // A write failure must not break the request either: we already have the
      // value to return, just without persisting it this time.
      console.warn("cache write failed", { key: namespacedKey }, error);
    }
  }

  return value;
};

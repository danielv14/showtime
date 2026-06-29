import { env } from "cloudflare:workers";

/**
 * Bump when a cached payload's shape changes so old entries are ignored rather
 * than deserialized into the wrong shape.
 */
const CACHE_VERSION = "v2";

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
 * If the binding is absent (a context without KV configured) it degrades to
 * calling `fetchFn` directly so the site still works.
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
    const hit = await kv.get<T>(namespacedKey, "json");
    if (hit !== null) return hit;
  }

  const value = await fetchFn();

  if (kv) {
    const degraded = options.isDegraded?.(value) ?? false;
    const effectiveTtl = degraded ? (options.degradedTtlSeconds ?? TTL.hour) : ttlSeconds;
    await kv.put(namespacedKey, JSON.stringify(value), {
      expirationTtl: effectiveTtl,
    });
  }

  return value;
};

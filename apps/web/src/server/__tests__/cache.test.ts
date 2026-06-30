import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { env } from "cloudflare:workers";
import { cached, TTL } from "../cache.js";

// Under test, `cloudflare:workers` resolves to a stub whose `env` is mutable
// (see the alias in vite.config.ts). Point `env.CACHE` at a fake KV namespace so
// we can drive cache hits, misses, and KV operations that throw.
const setCache = (value: unknown): void => {
  (env as unknown as { CACHE?: unknown }).CACHE = value;
};

describe("cached", () => {
  const kv = { get: vi.fn(), put: vi.fn() };

  beforeEach(() => {
    kv.get.mockReset();
    kv.put.mockReset();
    setCache(kv);
    // Silence (and let us assert) the structured logs the cache emits.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("returns the cached value on a hit without calling fetchFn", async () => {
    kv.get.mockResolvedValue({ cached: true });
    const fetchFn = vi.fn(async () => ({ cached: false }));

    const result = await cached("k", TTL.hour, fetchFn);

    expect(result).toEqual({ cached: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches and caches a fresh value on a miss", async () => {
    kv.get.mockResolvedValue(null);
    kv.put.mockResolvedValue(undefined);

    const result = await cached("k", TTL.hour, async () => "fresh");

    expect(result).toBe("fresh");
    expect(kv.put).toHaveBeenCalledTimes(1);
  });

  it("falls through to fetchFn when the KV read throws", async () => {
    kv.get.mockRejectedValue(new Error("KV read limit exceeded"));
    kv.put.mockResolvedValue(undefined);
    const fetchFn = vi.fn(async () => "fresh");

    const result = await cached("k", TTL.hour, fetchFn);

    expect(result).toBe("fresh");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalled();
  });

  it("still returns the fetched value when the KV write throws", async () => {
    kv.get.mockResolvedValue(null);
    kv.put.mockRejectedValue(new Error("KV write limit exceeded"));

    const result = await cached("k", TTL.hour, async () => "fresh");

    expect(result).toBe("fresh");
    expect(kv.put).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalled();
  });

  it("calls fetchFn directly when the KV binding is absent", async () => {
    setCache(undefined);

    const result = await cached("k", TTL.hour, async () => "fresh");

    expect(result).toBe("fresh");
    expect(kv.get).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });
});

import { createOmdbClient, createTmdbClient } from "@showtime/core";

/**
 * Read a required secret from the environment. On Cloudflare Workers these come
 * from `.dev.vars` (local) or `wrangler secret put` (production), surfaced via
 * `process.env` thanks to the `nodejs_compat` flag. Server-only: these are never
 * bundled into the client.
 */
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getTmdb = () => createTmdbClient(requireEnv("TMDB_API_KEY"));
export const getOmdb = () => createOmdbClient(requireEnv("OMDB_API_KEY"));

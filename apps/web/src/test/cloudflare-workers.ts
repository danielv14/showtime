// Test stub for the `cloudflare:workers` virtual module (wired via the
// `resolve.alias` in `vite.config.ts`, active only under Vitest). At build and
// runtime this module is provided by the Cloudflare Vite plugin, which is
// disabled under test, so this minimal stand-in holds a mutable `env` that tests
// populate with a fake `CACHE` binding.
export const env: { CACHE?: unknown } = {};

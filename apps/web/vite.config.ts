import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { lazyPlugins } from "vite-plus";

// Vitest can't load the Cloudflare worker environment (the plugin sets
// resolve.external, which the worker env rejects). Component tests only need
// React + jsdom, so the build/runtime plugins are skipped under test.
const isTest = !!process.env.VITEST;

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    // The `cloudflare:workers` virtual module is only provided by the Cloudflare
    // Vite plugin, which is disabled under test. Alias it to a stub so modules
    // that read `env` (e.g. the KV cache) can be unit-tested.
    alias: isTest
      ? {
          "cloudflare:workers": fileURLToPath(
            new URL("./src/test/cloudflare-workers.ts", import.meta.url),
          ),
        }
      : undefined,
  },
  plugins: isTest
    ? [viteReact()]
    : lazyPlugins(() => [
        cloudflare({ viteEnvironment: { name: "ssr" } }),
        devtools(),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
      ]),
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
  },
});

export default config;

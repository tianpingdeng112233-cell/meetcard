import { defineConfig } from "vitest/config";

/**
 * Vitest config — separate from vite.config.ts so that production
 * builds (Cloudflare Pages, npm run build) don't pull vitest into
 * the dependency graph. Engineers run `npm run test` locally.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});

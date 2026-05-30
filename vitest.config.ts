// ── Vitest configuration ──────────────────────────────────
import { defineConfig } from "vitest/config";              // typed config helper
import { fileURLToPath } from "node:url";                  // resolve project root for the @/ alias

export default defineConfig({
  test: {                                                  // test runner options
    environment: "node",                                   // pure logic — no DOM needed
  },
  resolve: {                                               // module resolution options
    alias: {                                               // path alias map
      "@": fileURLToPath(new URL(".", import.meta.url)),   // map @/ to the project root (mirrors tsconfig paths)
    },
  },
});

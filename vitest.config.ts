// ── Vitest configuration ──────────────────────────────────
import { defineConfig } from "vitest/config";              // typed config helper
import { fileURLToPath } from "node:url";                  // resolve project root for the @/ alias

export default defineConfig({
  test: {
    environment: "node",                                   // pure logic — no DOM needed
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),   // map @/ to the project root (mirrors tsconfig paths)
    },
  },
});

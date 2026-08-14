import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      // license-key.test.ts is a Next.js-only demo helper (imports
      // server-only); it is not a vitest suite.
      "src/lib/license-key.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
    ],
  },
});

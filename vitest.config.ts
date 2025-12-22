import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["apps/server/src/**/*.test.ts", "packages/api/src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "**/migrations/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["apps/server/src/**/*.ts", "packages/api/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/migrations/**",
        "**/__mocks__/**",
      ],
    },
  },
});

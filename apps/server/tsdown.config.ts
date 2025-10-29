import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@spectralNotify\/.*/],
  loader: {
    ".sql": "text", // Load SQL files as text strings
  },
});

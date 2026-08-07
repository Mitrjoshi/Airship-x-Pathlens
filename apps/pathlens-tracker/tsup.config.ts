import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    tracker: "src/index.ts",
  },

  format: ["iife"],

  globalName: "PathLens",

  outDir: "dist",

  clean: true,

  minify: true,

  sourcemap: false,

  target: "es2020",

  treeshake: true,

  dts: false,
});

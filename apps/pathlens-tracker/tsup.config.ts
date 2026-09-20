import "dotenv/config";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    tracker: "src/index.ts",
  },

  format: ["iife"],

  globalName: "Pathlens",

  outDir: "dist",

  clean: true,

  minify: true,

  sourcemap: false,

  target: "es2020",

  treeshake: true,

  dts: false,

  define: {
    "process.env.BASE_API_URL": JSON.stringify(
      process.env.BASE_API_URL ??
        "https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev"
    ),
  },
});

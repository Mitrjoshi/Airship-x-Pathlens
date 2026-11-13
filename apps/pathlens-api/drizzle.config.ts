import { defineConfig } from "drizzle-kit";
import "./src/config/load-env";

import { getDrizzleDatabaseCredentials } from "./src/db/connection-options";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: getDrizzleDatabaseCredentials(),
});

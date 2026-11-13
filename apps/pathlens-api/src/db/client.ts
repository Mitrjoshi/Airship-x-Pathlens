import "../config/load-env";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabasePoolOptions } from "./connection-options";

export const pool = new Pool(getDatabasePoolOptions());

export const db = drizzle(pool);

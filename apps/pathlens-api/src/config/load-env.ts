import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

export function loadEnvironment(
  directory = process.cwd(),
  target: NodeJS.ProcessEnv = process.env
) {
  const values: Record<string, string> = {};

  for (const filename of [".env", ".env.local"]) {
    const filenamePath = path.join(directory, filename);
    if (!fs.existsSync(filenamePath)) continue;
    Object.assign(values, dotenv.parse(fs.readFileSync(filenamePath)));
  }

  for (const [key, value] of Object.entries(values)) {
    if (target[key] === undefined) target[key] = value;
  }
}

loadEnvironment();

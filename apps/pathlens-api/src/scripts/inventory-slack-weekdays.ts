import "../config/load-env";

import { pool } from "../db/client";
import { getSlackWeekdayInventory } from "../models/slack-weekday-inventory.model";

async function main() {
  try {
    const rows = await getSlackWeekdayInventory();
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await pool.end();
  }
}

void main();

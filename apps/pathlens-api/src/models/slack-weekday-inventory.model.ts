import { sql } from "drizzle-orm";

import { db } from "../db/client";

export type SlackWeekdayInventoryRow = {
  integration_id: string;
  workspace_id: string;
  project_id: string;
  status: string;
  weekly_enabled: boolean | null;
  weekly_day: number | null;
  weekly_day_confirmed: boolean;
  timezone: string | null;
  classification: "disabled" | "invalid" | "confirmed" | "ambiguous";
};

export async function getSlackWeekdayInventory() {
  const result = await db.execute<SlackWeekdayInventoryRow>(sql`
    WITH raw AS (
      SELECT pi.id AS integration_id,
        p.workspace_id,
        p.id AS project_id,
        pi.status,
        pi.notification_preferences->>'weeklyEnabled' AS weekly_enabled_text,
        pi.settings->>'weeklyDay' AS weekly_day_text,
        COALESCE((pi.settings->>'weeklyDayConfirmed')::boolean, false)
          AS weekly_day_confirmed,
        pi.settings->>'timezone' AS timezone,
        pi.updated_at
      FROM project_integrations pi
      INNER JOIN integrations i ON i.id = pi.integration_id AND i.slug = 'slack'
      INNER JOIN projects p ON p.id = pi.project_id
    ), parsed AS (
      SELECT raw.*,
        CASE
          WHEN weekly_enabled_text IS NULL THEN false
          WHEN weekly_enabled_text IN ('true', 'false') THEN weekly_enabled_text::boolean
          ELSE NULL
        END AS weekly_enabled,
        CASE WHEN weekly_day_text ~ '^[0-9]{1,2}$'
          THEN weekly_day_text::integer
          ELSE NULL
        END AS weekly_day
      FROM raw
    )
    SELECT integration_id,
      workspace_id,
      project_id,
      status,
      weekly_enabled,
      weekly_day,
      weekly_day_confirmed,
      timezone,
      CASE
         WHEN weekly_enabled IS NULL
           THEN 'invalid'
         WHEN weekly_enabled = false
          THEN 'disabled'
        WHEN weekly_day IS NULL OR weekly_day < 1 OR weekly_day > 7
          THEN 'invalid'
        WHEN weekly_day_confirmed = true
          THEN 'confirmed'
        ELSE 'ambiguous'
      END AS classification
    FROM parsed
    ORDER BY classification, updated_at, integration_id
  `);
  return result.rows;
}

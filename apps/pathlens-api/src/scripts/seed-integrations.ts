import "../config/load-env";

import { db } from "../db/client";
import { integrations } from "../db/schema";

const catalog = {
  slug: "slack",
  name: "Slack",
  description:
    "Receive real-time notifications, performance alerts, and important analytics updates in your workspace.",
  content: "",
  assets: [],
  support: null,
  documentation: null,
  terms: null,
  privacy: null,
  website: null,
  category: "Notifications",
  iconUrl: "https://www.google.com/s2/favicons?domain=slack.com&sz=128",
  status: "available" as const,
  sortOrder: 1,
  isVisible: true,
};

async function seedIntegrations() {
  await db.insert(integrations).values(catalog).onConflictDoNothing({
    target: integrations.slug,
  });

  console.log(`Seeded integration catalog entry: ${catalog.slug}`);
}

seedIntegrations().catch((error) => {
  console.error("Unable to seed integrations:", error);
  process.exitCode = 1;
});

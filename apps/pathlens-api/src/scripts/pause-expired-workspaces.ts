import "dotenv/config";
import { pauseExpiredWorkspacesModel } from "../models/usage.model";

async function main() {
  const pausedCount = await pauseExpiredWorkspacesModel();
  console.log(`Paused ${pausedCount} expired workspace(s).`);
}

void main();

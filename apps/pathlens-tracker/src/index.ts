// src/index.ts

import { PathLensTracker } from "./tracker";
import { fetchTrackingScopes, readConfig } from "./utils";

declare global {
  interface Window {
    __PATHLENS__?: PathLensTracker;
  }
}

(async function bootstrap() {
  // Prevent duplicate initialization
  if (window.__PATHLENS__) {
    return;
  }

  const config = readConfig();

  try {
    config.trackingScopes = await fetchTrackingScopes(config);
  } catch (error) {
    console.error("[Pathlens] Tracker initialization failed.", error);
    return;
  }

  const tracker = new PathLensTracker(config);

  tracker.init();

  window.__PATHLENS__ = tracker;
})();

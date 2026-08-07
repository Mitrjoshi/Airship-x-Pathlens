// src/index.ts

import { PathLensTracker } from "./tracker";
import { readConfig } from "./utils";

declare global {
  interface Window {
    __PATHLENS__?: PathLensTracker;
  }
}

(function bootstrap() {
  // Prevent duplicate initialization
  if (window.__PATHLENS__) {
    return;
  }

  const config = readConfig();

  const tracker = new PathLensTracker(config);

  tracker.init();

  window.__PATHLENS__ = tracker;
})();

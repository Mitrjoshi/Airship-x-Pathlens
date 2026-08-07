// src/utils.ts

import type {
  ClientAnalyticsInfo,
  DeviceType,
  PathLensConfig,
  TrackedEvent,
} from "@workspace/contracts/tracker";

const VISITOR_KEY = "pathlens_visitor";
const DEFAULT_API_URL = "http://localhost:8080/api/events";

export function createVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }

  return id;
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function getPageInfo() {
  return {
    url: location.href,
    path: location.pathname,
    title: document.title,
  };
}

function getVersion(userAgent: string, pattern: RegExp): string | null {
  return userAgent.match(pattern)?.[1] ?? null;
}

function getDeviceType(userAgent: string): DeviceType {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) {
    return "tablet";
  }

  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
    return "mobile";
  }

  if (userAgent) {
    return "desktop";
  }

  return "unknown";
}

function getBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) {
    return {
      name: "Edge",
      version: getVersion(userAgent, /Edg\/([\d.]+)/i),
    };
  }

  if (/OPR\//i.test(userAgent)) {
    return {
      name: "Opera",
      version: getVersion(userAgent, /OPR\/([\d.]+)/i),
    };
  }

  if (/Chrome\//i.test(userAgent)) {
    return {
      name: "Chrome",
      version: getVersion(userAgent, /Chrome\/([\d.]+)/i),
    };
  }

  if (/Firefox\//i.test(userAgent)) {
    return {
      name: "Firefox",
      version: getVersion(userAgent, /Firefox\/([\d.]+)/i),
    };
  }

  if (/Safari\//i.test(userAgent)) {
    return {
      name: "Safari",
      version: getVersion(userAgent, /Version\/([\d.]+)/i),
    };
  }

  return {
    name: "Other",
    version: null,
  };
}

function getOperatingSystem(userAgent: string) {
  if (/Windows NT/i.test(userAgent)) {
    return {
      name: "Windows",
      version: getVersion(userAgent, /Windows NT ([\d.]+)/i),
    };
  }

  if (/Android/i.test(userAgent)) {
    return {
      name: "Android",
      version: getVersion(userAgent, /Android ([\d.]+)/i),
    };
  }

  if (/(iPhone|iPad|iPod)/i.test(userAgent)) {
    return {
      name: "iOS",
      version:
        getVersion(userAgent, /OS ([\d_]+)/i)?.replace(/_/g, ".") ?? null,
    };
  }

  if (/Mac OS X/i.test(userAgent)) {
    return {
      name: "macOS",
      version:
        getVersion(userAgent, /Mac OS X ([\d_]+)/i)?.replace(/_/g, ".") ?? null,
    };
  }

  if (/Linux/i.test(userAgent)) {
    return {
      name: "Linux",
      version: null,
    };
  }

  return {
    name: "Other",
    version: null,
  };
}

function getCountryCode(): string | undefined {
  const locales = [navigator.language, ...navigator.languages];

  for (const locale of locales) {
    const match = locale.match(/[-_]([A-Za-z]{2})$/);

    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

export function getAnalyticsInfo(): ClientAnalyticsInfo {
  const userAgent = navigator.userAgent;
  const browser = getBrowser(userAgent);
  const operatingSystem = getOperatingSystem(userAgent);

  return {
    device: getDeviceType(userAgent),
    browser: browser.name,
    browserVersion: browser.version,
    os: operatingSystem.name,
    osVersion: operatingSystem.version,
    countryCode: getCountryCode(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent,
    referrer: document.referrer,
  };
}

export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  let lastRun = 0;

  return ((...args: Parameters<T>) => {
    const current = Date.now();

    if (current - lastRun < delay) return;

    lastRun = current;

    fn(...args);
  }) as T;
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  let timeout: number | undefined;

  return ((...args: Parameters<T>) => {
    window.clearTimeout(timeout);

    timeout = window.setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

export function debug(
  config: PathLensConfig,
  message: string,
  ...args: unknown[]
) {
  if (!config.debug) return;

  console.log(`[PathLens] ${message}`, ...args);
}

export function flushQueue(
  config: PathLensConfig,
  queue: TrackedEvent[]
): void {
  if (!queue.length) return;

  const payload = JSON.stringify(queue);

  debug(config, `Flushing ${queue.length} events`);

  // if (navigator.sendBeacon) {
  //   const blob = new Blob([payload], {
  //     type: "application/json",
  //   });

  //   navigator.sendBeacon(config.apiUrl, blob);

  //   queue.length = 0;

  //   return;
  // }

  fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch((err) => {
    console.error("[PathLens]", err);
  });

  queue.length = 0;
}

export function readConfig(): PathLensConfig {
  const script = document.currentScript as HTMLScriptElement | null;

  if (!script) {
    throw new Error("PathLens: Unable to locate current script.");
  }

  const dataset = script.dataset;

  if (!dataset.projectId) {
    throw new Error("PathLens: data-project-id is required.");
  }

  return {
    projectId: dataset.projectId,
    apiUrl: DEFAULT_API_URL,

    debug: dataset.debug === "true",

    captureClicks: dataset.captureClicks !== "false",
    captureScroll: dataset.captureScroll !== "false",
    captureMouseMove: dataset.captureMouseMove !== "false",
    captureResize: dataset.captureResize !== "false",
    captureForms: dataset.captureForms !== "false",
    captureInputs: dataset.captureInputs !== "false",
    captureErrors: dataset.captureErrors !== "false",
    capturePerformance: dataset.capturePerformance !== "false",
    captureNavigation: dataset.captureNavigation !== "false",

    flushInterval: Number(dataset.flushInterval ?? 5000),
    batchSize: Number(dataset.batchSize ?? 25),
  };
}

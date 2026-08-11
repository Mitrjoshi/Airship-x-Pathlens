// src/events.ts

import type { PathLensTracker } from "./tracker";
import { throttle } from "./utils";

function getSafeClickText(element: HTMLElement): string {
  if (
    element.closest(
      "[data-pathlens-mask], [data-pathlens-block], input, textarea, select"
    )
  ) {
    return "[masked]";
  }

  return element.innerText.substring(0, 100);
}

export function registerEvents(tracker: PathLensTracker): void {
  pageView(tracker);

  registerClicks(tracker);
  registerScroll(tracker);
  registerMouseMove(tracker);
  registerResize(tracker);
  registerForms(tracker);
  registerInputs(tracker);
  registerErrors(tracker);
  registerNavigation(tracker);
  registerPerformance(tracker);
  registerUnload(tracker);
}

function pageView(tracker: PathLensTracker) {
  tracker.track("page_view");
}

function registerClicks(tracker: PathLensTracker) {
  if (!tracker.config.captureClicks) return;

  document.addEventListener("click", (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;

    if (!el) return;

    tracker.track("click", {
      x: e.clientX,
      y: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      tag: el.tagName,
      id: el.id,
      className: el.className,
      text: getSafeClickText(el),
    });
  });
}

function registerScroll(tracker: PathLensTracker) {
  if (!tracker.config.captureScroll) return;

  window.addEventListener(
    "scroll",
    throttle(() => {
      const percentage =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;

      tracker.track("scroll", {
        scrollY: window.scrollY,
        percentage: Math.round(percentage),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    }, 500)
  );
}

function registerMouseMove(tracker: PathLensTracker) {
  if (!tracker.config.captureMouseMove) return;

  document.addEventListener(
    "mousemove",
    throttle((e: MouseEvent) => {
      tracker.track("mousemove", {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });
    }, 100)
  );
}

function registerResize(tracker: PathLensTracker) {
  if (!tracker.config.captureResize) return;

  window.addEventListener("resize", () => {
    tracker.track("resize", {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });
}

function registerForms(tracker: PathLensTracker) {
  if (!tracker.config.captureForms) return;

  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement | null;

    if (!form) return;

    tracker.track("form_submit", {
      id: form.id,
      action: form.action,
      method: form.method,
    });
  });
}

function registerInputs(tracker: PathLensTracker) {
  if (!tracker.config.captureInputs) return;

  document.addEventListener("change", (e) => {
    const input = e.target as
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

    if (!input) return;

    if (input instanceof HTMLInputElement && input.type === "password") {
      return;
    }

    tracker.track("input_change", {
      id: input.id,
      name: input.name,
      type:
        input instanceof HTMLInputElement
          ? input.type
          : input.tagName.toLowerCase(),
    });
  });
}

function registerErrors(tracker: PathLensTracker) {
  if (!tracker.config.captureErrors) return;

  window.addEventListener("error", (e) => {
    tracker.track("javascript_error", {
      message: e.message,
      file: e.filename,
      line: e.lineno,
      column: e.colno,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    tracker.track("promise_rejection", {
      reason: String(e.reason),
    });
  });
}

function registerNavigation(tracker: PathLensTracker) {
  if (!tracker.config.captureNavigation) return;

  const pushState = history.pushState;

  history.pushState = function (...args) {
    pushState.apply(history, args);

    tracker.track("page_view");
  };

  const replaceState = history.replaceState;

  history.replaceState = function (...args) {
    replaceState.apply(history, args);

    tracker.track("page_view");
  };

  window.addEventListener("popstate", () => {
    tracker.track("page_view");
  });
}

function registerPerformance(tracker: PathLensTracker) {
  if (!tracker.config.capturePerformance) return;

  window.addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;

      if (!nav) return;

      tracker.track("performance", {
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart),
        domLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      });
    }, 0);
  });
}

function registerUnload(tracker: PathLensTracker) {
  window.addEventListener("beforeunload", () => {
    tracker.track("session_end", {
      duration: Date.now() - tracker.sessionStart,
      totalEvents: tracker.queue.length,
    });

    tracker.destroy();
  });
}

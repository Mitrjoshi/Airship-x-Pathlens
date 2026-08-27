// src/events.ts

import type { PathLensTracker } from "./tracker";
import { throttle } from "./utils";

const MAX_ERROR_MESSAGE_LENGTH = 2048;
const MAX_ERROR_STACK_LENGTH = 16384;

function getDocumentDimensions(): { width: number; height: number } {
  const documentElement = document.documentElement;
  const body = document.body;
  const widths = [
    documentElement.scrollWidth,
    documentElement.offsetWidth,
    documentElement.clientWidth,
    body?.scrollWidth,
    body?.offsetWidth,
    body?.clientWidth,
    window.innerWidth,
  ];
  const heights = [
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    documentElement.clientHeight,
    body?.scrollHeight,
    body?.offsetHeight,
    body?.clientHeight,
    window.innerHeight,
  ];

  return {
    width: Math.max(1, ...widths.filter(Number.isFinite)),
    height: Math.max(1, ...heights.filter(Number.isFinite)),
  };
}

interface ErrorDetails {
  name?: string;
  message?: string;
  stack?: string;
}

function truncate(
  value: string | undefined,
  maximum: number
): string | undefined {
  if (!value) return undefined;

  return value.length > maximum
    ? `${value.slice(0, maximum)}\n[truncated]`
    : value;
}

function getErrorDetails(value: unknown): ErrorDetails | null {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === "string") return { message: value };

  return null;
}

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

function getNormalizedButtonText(button: HTMLButtonElement): string {
  return getSafeClickText(button).replace(/\s+/g, " ").trim();
}

function getElementKey(
  element: HTMLElement,
  button: HTMLButtonElement | null,
  pageX: number,
  pageY: number,
  documentDimensions: { width: number; height: number }
): string {
  const regionKey = `region:${Math.min(19, Math.max(0, Math.floor((pageX / documentDimensions.width) * 20)))}:${Math.min(19, Math.max(0, Math.floor((pageY / documentDimensions.height) * 20)))}`;

  if (element.closest("[data-pathlens-mask], [data-pathlens-block]")) {
    return regionKey;
  }

  const id = element.id.trim();
  if (id) return `id:${id.slice(0, 100)}`;

  const buttonText = button
    ? getSafeClickText(button).replace(/\s+/g, " ").trim()
    : "";
  if (buttonText && buttonText !== "[masked]") {
    return `button:${buttonText.slice(0, 100)}`;
  }

  const text = getSafeClickText(element).replace(/\s+/g, " ").trim();
  if (text && text !== "[masked]") return `text:${text.slice(0, 100)}`;

  const className =
    typeof element.className === "string"
      ? element.className
          .split(/\s+/)
          .filter((value) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value))
          .slice(0, 3)
          .join(".")
      : "";
  if (element.tagName || className) {
    return `tag:${element.tagName.toLowerCase()}${className ? `:${className}` : ""}`;
  }

  return regionKey;
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

    const button = el.closest("button");
    const documentDimensions = getDocumentDimensions();

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
      document: documentDimensions,
      tag: el.tagName,
      id: el.id,
      className: el.className,
      text: getSafeClickText(el),
      ...(button ? { buttonText: getNormalizedButtonText(button) } : {}),
      elementKey: getElementKey(
        el,
        button,
        e.pageX,
        e.pageY,
        documentDimensions
      ),
    });
  });
}

function registerScroll(tracker: PathLensTracker) {
  if (!tracker.config.captureScroll) return;

  window.addEventListener(
    "scroll",
    throttle(() => {
      const documentDimensions = getDocumentDimensions();
      const maxScrollableHeight = Math.max(
        documentDimensions.height - window.innerHeight,
        0
      );
      const scrollY = Number.isFinite(window.scrollY) ? window.scrollY : 0;
      const rawPercentage =
        maxScrollableHeight === 0 ? 100 : (scrollY / maxScrollableHeight) * 100;
      const percentage = Math.min(100, Math.max(0, rawPercentage));

      tracker.track("scroll", {
        scrollY,
        percentage: Math.round(percentage),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        document: documentDimensions,
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
    // Resource loading errors do not have an Error object or a useful message.
    if (!e.error && !e.message) return;

    const details = getErrorDetails(e.error);

    tracker.track("javascript_error", {
      message:
        truncate(details?.message ?? e.message, MAX_ERROR_MESSAGE_LENGTH) ??
        "Unknown JavaScript error",
      file: e.filename,
      line: e.lineno,
      column: e.colno,
      ...(details?.name ? { name: details.name.slice(0, 128) } : {}),
      ...(details?.stack
        ? { stack: truncate(details.stack, MAX_ERROR_STACK_LENGTH) }
        : {}),
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const details = getErrorDetails(e.reason);
    const reason =
      details?.message ??
      (typeof e.reason === "string" ? e.reason : String(e.reason));

    tracker.track("promise_rejection", {
      reason: truncate(reason, MAX_ERROR_MESSAGE_LENGTH) ?? "Unknown rejection",
      ...(details?.name ? { name: details.name.slice(0, 128) } : {}),
      ...(details?.stack
        ? { stack: truncate(details.stack, MAX_ERROR_STACK_LENGTH) }
        : {}),
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

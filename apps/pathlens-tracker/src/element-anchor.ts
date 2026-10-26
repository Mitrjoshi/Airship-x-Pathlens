import type {
  ClickElementAnchor,
  ClickElementPositionMode,
  ClickElementRect,
  ClickElementScrollAncestor,
  ClickElementStickyInset,
} from "@workspace/contracts/tracker";
import {
  CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION,
  hashClickAnchorFingerprint,
  MAX_CLICK_ELEMENT_ANCHOR_BYTES,
  MAX_CLICK_ELEMENT_ANCHOR_DEPTH,
  MAX_CLICK_ELEMENT_ANCHOR_DIMENSION,
  MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH,
  MAX_CLICK_ELEMENT_SCROLL_ANCESTORS,
} from "@workspace/contracts/element-anchor";

const EXPLICIT_ANCHOR_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SENSITIVE_SELECTOR =
  "[data-pathlens-mask], [data-pathlens-block], input, textarea, select";
const SCROLL_VALUES = new Set(["auto", "scroll", "overlay"]);

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function validRect(rect: ClickElementRect): boolean {
  return (
    finite(rect.left) &&
    finite(rect.top) &&
    finite(rect.width) &&
    finite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.width <= MAX_CLICK_ELEMENT_ANCHOR_DIMENSION &&
    rect.height <= MAX_CLICK_ELEMENT_ANCHOR_DIMENSION
  );
}

function getElementPath(element: Element): string | null {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current) {
    if (segments.length >= MAX_CLICK_ELEMENT_ANCHOR_DEPTH) return null;

    const parent: Element | null = current.parentElement;
    const tagName = current.tagName.toLowerCase();
    const siblings = parent
      ? Array.from(parent.children).filter(
          (candidate) => candidate.tagName.toLowerCase() === tagName
        )
      : [];
    const siblingIndex = Math.max(0, siblings.indexOf(current));
    segments.unshift(`${tagName}:${siblingIndex}`);
    current = parent;
  }

  return segments.join("/");
}

function getAnchorId(element: Element): string | null {
  const explicit = element.getAttribute("data-pathlens-anchor");
  const fingerprint =
    explicit && EXPLICIT_ANCHOR_PATTERN.test(explicit)
      ? `explicit:${explicit}`
      : getElementPath(element);

  if (!fingerprint) return null;

  const anchorId = hashClickAnchorFingerprint(fingerprint);
  return anchorId.length <= MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH
    ? anchorId
    : null;
}

function isSensitiveElement(element: HTMLElement): boolean {
  if (element.closest(SENSITIVE_SELECTOR)) return true;

  return (
    element.tagName.toLowerCase() === "input" &&
    (element.getAttribute("type") ?? "").toLowerCase() === "password"
  );
}

function getPositionMode(element: HTMLElement): ClickElementPositionMode {
  const position = window.getComputedStyle(element).position;

  if (
    position === "absolute" ||
    position === "fixed" ||
    position === "sticky"
  ) {
    return position;
  }

  return "static";
}

interface PositioningAncestor {
  mode: Extract<ClickElementPositionMode, "fixed" | "sticky">;
  depth: number;
  anchorId: string;
}

function getPositioningAncestor(
  element: HTMLElement
): PositioningAncestor | null {
  let current = element.parentElement;
  let depth = 1;

  while (current && depth <= MAX_CLICK_ELEMENT_ANCHOR_DEPTH) {
    const mode = getPositionMode(current);
    if (mode === "fixed" || mode === "sticky") {
      const anchorId = getAnchorId(current);
      return anchorId ? { mode, depth, anchorId } : null;
    }

    current = current.parentElement;
    depth += 1;
  }

  return null;
}

function getStickyInset(element: HTMLElement): ClickElementStickyInset | null {
  const style = window.getComputedStyle(element);
  const inset: ClickElementStickyInset = {};

  for (const side of ["top", "right", "bottom", "left"] as const) {
    const value = Number.parseFloat(style[side]);
    if (finite(value)) inset[side] = value;
  }

  return Object.keys(inset).length > 0 ? inset : null;
}

function hasTransformedAncestor(element: HTMLElement): boolean {
  let current = element.parentElement;

  while (current) {
    if (window.getComputedStyle(current).transform !== "none") return true;
    current = current.parentElement;
  }

  return false;
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const scrollableX =
    SCROLL_VALUES.has(style.overflowX) &&
    element.scrollWidth > element.clientWidth;
  const scrollableY =
    SCROLL_VALUES.has(style.overflowY) &&
    element.scrollHeight > element.clientHeight;

  return scrollableX || scrollableY;
}

function getScrollAncestors(
  element: HTMLElement
): ClickElementScrollAncestor[] | null {
  const ancestors: ClickElementScrollAncestor[] = [];
  let current = element.parentElement;

  while (current) {
    if (isScrollable(current)) {
      if (ancestors.length >= MAX_CLICK_ELEMENT_SCROLL_ANCESTORS) return null;

      const anchorId = getAnchorId(current);
      const maxScrollLeft = Math.max(
        0,
        current.scrollWidth - current.clientWidth
      );
      const maxScrollTop = Math.max(
        0,
        current.scrollHeight - current.clientHeight
      );
      if (
        !anchorId ||
        !finite(current.scrollLeft) ||
        !finite(current.scrollTop) ||
        !finite(maxScrollLeft) ||
        !finite(maxScrollTop) ||
        maxScrollLeft > MAX_CLICK_ELEMENT_ANCHOR_DIMENSION ||
        maxScrollTop > MAX_CLICK_ELEMENT_ANCHOR_DIMENSION
      ) {
        return null;
      }

      ancestors.push({
        anchorId,
        scrollLeft: current.scrollLeft,
        scrollTop: current.scrollTop,
        maxScrollLeft,
        maxScrollTop,
      });
    }
    current = current.parentElement;
  }

  return ancestors;
}

export function createClickElementAnchor(
  element: HTMLElement,
  clientX: number,
  clientY: number
): ClickElementAnchor | null {
  if (isSensitiveElement(element) || !finite(clientX) || !finite(clientY)) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const capturedRect: ClickElementRect = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  if (!validRect(capturedRect)) return null;

  const relativeX = (clientX - capturedRect.left) / capturedRect.width;
  const relativeY = (clientY - capturedRect.top) / capturedRect.height;
  if (
    !finite(relativeX) ||
    !finite(relativeY) ||
    relativeX < 0 ||
    relativeX > 1 ||
    relativeY < 0 ||
    relativeY > 1
  ) {
    return null;
  }

  const anchorId = getAnchorId(element);
  const scrollAncestors = getScrollAncestors(element);
  if (!anchorId || !scrollAncestors) return null;

  const positionMode = getPositionMode(element);
  const positioningAncestor = getPositioningAncestor(element);
  const anchor: ClickElementAnchor = {
    schemaVersion: CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION,
    anchorId,
    positionMode,
    relativeX,
    relativeY,
    capturedRect,
    transformedAncestor: hasTransformedAncestor(element),
    scrollAncestors,
  };
  if (positioningAncestor) {
    anchor.effectivePositionMode = positioningAncestor.mode;
    anchor.positioningAncestorDepth = positioningAncestor.depth;
    anchor.positioningAncestorAnchorId = positioningAncestor.anchorId;
  }
  if (positionMode === "sticky") {
    const stickyInset = getStickyInset(element);
    if (stickyInset) anchor.stickyInset = stickyInset;
  }

  return JSON.stringify(anchor).length <= MAX_CLICK_ELEMENT_ANCHOR_BYTES
    ? anchor
    : null;
}

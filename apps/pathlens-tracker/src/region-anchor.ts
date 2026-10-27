import type { ClickRegionAnchor } from "@workspace/contracts/region-anchor";
import {
  hashRegionFingerprint,
  MAX_REGION_ANCHOR_BYTES,
  MAX_REGION_DIMENSION,
  MAX_REGION_ID_LENGTH,
  REGION_ANCHOR_SCHEMA_VERSION,
} from "@workspace/contracts/region-anchor";

const REGION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_REGION_DEPTH = 8;
const SEMANTIC_TAGS = new Set([
  "main",
  "header",
  "footer",
  "section",
  "article",
  "aside",
  "nav",
]);

type RegionCandidate = {
  element: HTMLElement;
  kind: NonNullable<ClickRegionAnchor["regionKind"]>;
  fingerprint: string;
};

function positionMode(element: HTMLElement): ClickRegionAnchor["positionMode"] {
  const position = window.getComputedStyle(element).position;
  return position === "absolute" ||
    position === "fixed" ||
    position === "sticky"
    ? position
    : "static";
}

function structuralPath(element: HTMLElement): string | null {
  const segments: string[] = [];
  let current: HTMLElement | null = element;
  while (current) {
    if (segments.length >= MAX_REGION_DEPTH) return null;
    const tagName = current.tagName.toLowerCase();
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          (candidate) => candidate.tagName.toLowerCase() === tagName
        )
      : [];
    segments.unshift(`${tagName}:${Math.max(0, siblings.indexOf(current))}`);
    current = current.parentElement;
  }
  return segments.join("/");
}

function visibleRegion(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width >= 64 &&
    rect.height >= 32 &&
    rect.width <= MAX_REGION_DIMENSION &&
    rect.height <= MAX_REGION_DIMENSION
  );
}

function automaticRegion(element: HTMLElement): RegionCandidate | null {
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < MAX_REGION_DEPTH) {
    if (
      SEMANTIC_TAGS.has(current.tagName.toLowerCase()) &&
      visibleRegion(current)
    ) {
      const fingerprint = structuralPath(current);
      if (fingerprint)
        return { element: current, kind: "semantic", fingerprint };
    }
    current = current.parentElement;
    depth += 1;
  }

  current = element;
  depth = 0;
  while (current && depth < MAX_REGION_DEPTH) {
    if (
      current.tagName.toLowerCase() === "div" &&
      current.children.length >= 2 &&
      visibleRegion(current)
    ) {
      const fingerprint = structuralPath(current);
      if (fingerprint)
        return { element: current, kind: "structural", fingerprint };
    }
    current = current.parentElement;
    depth += 1;
  }
  return null;
}

export function createClickRegionAnchor(
  element: HTMLElement,
  clientX: number,
  clientY: number
): ClickRegionAnchor | null {
  const region = element.closest<HTMLElement>("[data-pathlens-region]");
  const value = region?.getAttribute("data-pathlens-region")?.trim() ?? "";
  const explicit =
    region && REGION_ID_PATTERN.test(value)
      ? {
          element: region,
          kind: "explicit" as const,
          fingerprint: `explicit-region:${value}`,
        }
      : null;
  const candidate = explicit ?? automaticRegion(element);
  if (
    !candidate ||
    element.closest(
      "[data-pathlens-mask], [data-pathlens-block], input, textarea, select"
    ) ||
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY)
  ) {
    return null;
  }

  const rect = candidate.element.getBoundingClientRect();
  if (
    !Number.isFinite(rect.left) ||
    !Number.isFinite(rect.top) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.width > MAX_REGION_DIMENSION ||
    rect.height > MAX_REGION_DIMENSION
  ) {
    return null;
  }

  const relativeX = (clientX - rect.left) / rect.width;
  const relativeY = (clientY - rect.top) / rect.height;
  if (
    !Number.isFinite(relativeX) ||
    !Number.isFinite(relativeY) ||
    relativeX < 0 ||
    relativeX > 1 ||
    relativeY < 0 ||
    relativeY > 1
  ) {
    return null;
  }

  const anchor: ClickRegionAnchor = {
    schemaVersion: REGION_ANCHOR_SCHEMA_VERSION,
    regionId: hashRegionFingerprint(candidate.fingerprint),
    regionKind: candidate.kind,
    structuralFingerprint: candidate.fingerprint,
    positionMode: positionMode(candidate.element),
    relativeX,
    relativeY,
    capturedRect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
  };

  return anchor.regionId.length <= MAX_REGION_ID_LENGTH &&
    JSON.stringify(anchor).length <= MAX_REGION_ANCHOR_BYTES
    ? anchor
    : null;
}

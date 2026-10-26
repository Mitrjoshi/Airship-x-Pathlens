import assert from "node:assert/strict";
import { test } from "node:test";
import { hashClickAnchorFingerprint } from "@workspace/contracts/element-anchor";
import { createClickElementAnchor } from "./element-anchor";

interface FakeStyle {
  position: string;
  transform: string;
  overflowX: string;
  overflowY: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
}

class FakeElement {
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  clientWidth = 0;
  clientHeight = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  scrollLeft = 0;
  scrollTop = 0;

  constructor(
    readonly tagName: string,
    private readonly rect: DOMRect,
    readonly style: FakeStyle,
    private readonly attributes: Record<string, string> = {}
  ) {}

  append(child: FakeElement): this {
    child.parentElement = this;
    this.children.push(child);
    return this;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  closest(selector: string): FakeElement | null {
    let current: FakeElement | null = this;
    while (current) {
      if (
        selector.includes("[data-pathlens-mask]") &&
        current.getAttribute("data-pathlens-mask") !== null
      ) {
        return current;
      }
      if (
        selector.includes("[data-pathlens-block]") &&
        current.getAttribute("data-pathlens-block") !== null
      ) {
        return current;
      }
      if (
        ["input", "textarea", "select"].includes(current.tagName.toLowerCase())
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  getBoundingClientRect(): DOMRect {
    return this.rect;
  }
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return { left, top, width, height } as DOMRect;
}

function installWindow(): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      getComputedStyle: (element: FakeElement) => element.style,
    },
  });
}

function buttonTree(button: FakeElement): FakeElement {
  const html = new FakeElement("HTML", rect(0, 0, 1000, 2000), {
    position: "static",
    transform: "none",
    overflowX: "visible",
    overflowY: "visible",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  const body = new FakeElement("BODY", rect(0, 0, 1000, 2000), html.style);
  html.append(body).append(button);
  return html;
}

test("preserves the click offset inside a normal element", () => {
  installWindow();
  const button = new FakeElement("BUTTON", rect(100, 200, 200, 100), {
    position: "static",
    transform: "none",
    overflowX: "visible",
    overflowY: "visible",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  buttonTree(button);

  const anchor = createClickElementAnchor(
    button as unknown as HTMLElement,
    150,
    225
  );

  assert.ok(anchor);
  assert.equal(anchor.relativeX, 0.25);
  assert.equal(anchor.relativeY, 0.25);
  assert.equal(anchor.positionMode, "static");
  assert.equal(anchor.transformedAncestor, false);
});

test("classifies absolute elements without changing their click offset", () => {
  installWindow();
  const button = new FakeElement("BUTTON", rect(40, 80, 160, 80), {
    position: "absolute",
    transform: "none",
    overflowX: "visible",
    overflowY: "visible",
    top: "80px",
    right: "auto",
    bottom: "auto",
    left: "40px",
  });
  buttonTree(button);

  const anchor = createClickElementAnchor(
    button as unknown as HTMLElement,
    120,
    120
  );

  assert.ok(anchor);
  assert.equal(anchor.positionMode, "absolute");
  assert.equal(anchor.relativeX, 0.5);
  assert.equal(anchor.relativeY, 0.5);
});

test("records the nearest sticky and fixed ancestor for static children", () => {
  installWindow();
  const html = new FakeElement("HTML", rect(0, 0, 1000, 2000), {
    position: "static",
    transform: "none",
    overflowX: "visible",
    overflowY: "visible",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  const body = new FakeElement("BODY", rect(0, 0, 1000, 2000), html.style);
  const stickyHeader = new FakeElement(
    "HEADER",
    rect(0, 0, 1000, 80),
    {
      position: "sticky",
      transform: "none",
      overflowX: "visible",
      overflowY: "visible",
      top: "0px",
      right: "auto",
      bottom: "auto",
      left: "auto",
    },
    { "data-pathlens-anchor": "sticky-header" }
  );
  const nav = new FakeElement("NAV", rect(0, 0, 1000, 80), body.style);
  const stickyLink = new FakeElement("A", rect(100, 20, 120, 40), body.style);
  const fixedHeader = new FakeElement(
    "HEADER",
    rect(0, 100, 1000, 60),
    {
      position: "fixed",
      transform: "none",
      overflowX: "visible",
      overflowY: "visible",
      top: "100px",
      right: "auto",
      bottom: "auto",
      left: "auto",
    },
    { "data-pathlens-anchor": "fixed-header" }
  );
  const fixedLink = new FakeElement("A", rect(100, 110, 120, 40), body.style);
  html.append(body);
  body.append(stickyHeader).append(fixedHeader);
  stickyHeader.append(nav);
  nav.append(stickyLink);
  fixedHeader.append(fixedLink);

  const stickyAnchor = createClickElementAnchor(
    stickyLink as unknown as HTMLElement,
    160,
    40
  );
  const fixedAnchor = createClickElementAnchor(
    fixedLink as unknown as HTMLElement,
    160,
    130
  );

  assert.ok(stickyAnchor);
  assert.equal(stickyAnchor.positionMode, "static");
  assert.equal(stickyAnchor.effectivePositionMode, "sticky");
  assert.equal(stickyAnchor.positioningAncestorDepth, 2);
  assert.equal(stickyAnchor.relativeX, 0.5);
  assert.equal(stickyAnchor.relativeY, 0.5);
  assert.equal(
    stickyAnchor.positioningAncestorAnchorId,
    hashClickAnchorFingerprint("explicit:sticky-header")
  );

  assert.ok(fixedAnchor);
  assert.equal(fixedAnchor.positionMode, "static");
  assert.equal(fixedAnchor.effectivePositionMode, "fixed");
  assert.equal(fixedAnchor.positioningAncestorDepth, 1);
  assert.equal(fixedAnchor.relativeX, 0.5);
  assert.equal(fixedAnchor.relativeY, 0.5);
});

test("captures fixed, sticky, transformed, and nested-scroll metadata", () => {
  installWindow();
  const transformed = new FakeElement("DIV", rect(0, 0, 800, 800), {
    position: "static",
    transform: "matrix(1, 0, 0, 1, 20, 20)",
    overflowX: "visible",
    overflowY: "visible",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  const scroll = new FakeElement("DIV", rect(0, 0, 400, 300), {
    position: "static",
    transform: "none",
    overflowX: "auto",
    overflowY: "auto",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  scroll.clientWidth = 400;
  scroll.clientHeight = 300;
  scroll.scrollWidth = 800;
  scroll.scrollHeight = 900;
  scroll.scrollLeft = 12;
  scroll.scrollTop = 34;
  const button = new FakeElement(
    "BUTTON",
    rect(80, 90, 120, 60),
    {
      position: "fixed",
      transform: "none",
      overflowX: "visible",
      overflowY: "visible",
      top: "12px",
      right: "auto",
      bottom: "auto",
      left: "auto",
    },
    { "data-pathlens-anchor": "fixed-action" }
  );
  transformed.append(scroll);
  scroll.append(button);

  const anchor = createClickElementAnchor(
    button as unknown as HTMLElement,
    140,
    120
  );

  assert.ok(anchor);
  assert.equal(anchor.positionMode, "fixed");
  assert.equal(anchor.relativeX, 0.5);
  assert.equal(anchor.relativeY, 0.5);
  assert.equal(anchor.transformedAncestor, true);
  assert.equal(anchor.scrollAncestors.length, 1);
  assert.equal(anchor.scrollAncestors[0]?.scrollTop, 34);
  assert.notEqual(anchor.anchorId, "fixed-action");
});

test("captures sticky insets and deterministic structural identities", () => {
  installWindow();
  const create = () => {
    const button = new FakeElement("BUTTON", rect(20, 30, 100, 40), {
      position: "sticky",
      transform: "none",
      overflowX: "visible",
      overflowY: "visible",
      top: "16px",
      right: "auto",
      bottom: "auto",
      left: "auto",
    });
    return { root: buttonTree(button), button };
  };
  const first = create();
  const second = create();

  const firstAnchor = createClickElementAnchor(
    first.button as unknown as HTMLElement,
    50,
    50
  );
  const secondAnchor = createClickElementAnchor(
    second.button as unknown as HTMLElement,
    50,
    50
  );

  assert.ok(firstAnchor);
  assert.ok(secondAnchor);
  assert.equal(firstAnchor.anchorId, secondAnchor.anchorId);
  assert.equal(firstAnchor.positionMode, "sticky");
  assert.deepEqual(firstAnchor.stickyInset, { top: 16 });
});

test("rejects sensitive, out-of-bounds, and excessively deep targets", () => {
  installWindow();
  const sensitive = new FakeElement(
    "INPUT",
    rect(0, 0, 100, 40),
    {
      position: "static",
      transform: "none",
      overflowX: "visible",
      overflowY: "visible",
      top: "auto",
      right: "auto",
      bottom: "auto",
      left: "auto",
    },
    { type: "password" }
  );
  const blocked = new FakeElement("BUTTON", rect(0, 0, 100, 40), {
    position: "static",
    transform: "none",
    overflowX: "visible",
    overflowY: "visible",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
  });
  const block = new FakeElement(
    "DIV",
    rect(0, 0, 100, 40),
    {
      ...blocked.style,
    },
    { "data-pathlens-block": "" }
  );
  block.append(blocked);

  assert.equal(
    createClickElementAnchor(sensitive as unknown as HTMLElement, 10, 10),
    null
  );
  assert.equal(
    createClickElementAnchor(blocked as unknown as HTMLElement, 10, 10),
    null
  );

  const normal = new FakeElement("BUTTON", rect(0, 0, 100, 40), {
    ...blocked.style,
  });
  assert.equal(
    createClickElementAnchor(normal as unknown as HTMLElement, 200, 200),
    null
  );

  let deepParent = buttonTree(normal);
  for (let index = 0; index < 8; index += 1) {
    const next = new FakeElement("DIV", rect(0, 0, 100, 40), {
      ...blocked.style,
    });
    deepParent.append(next);
    deepParent = next;
  }
  const deepTarget = new FakeElement("BUTTON", rect(0, 0, 100, 40), {
    ...blocked.style,
  });
  deepParent.append(deepTarget);
  assert.equal(
    createClickElementAnchor(deepTarget as unknown as HTMLElement, 10, 10),
    null
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { isPrimaryPointerInteraction } from "./events";

test("accepts the primary pointer interaction for mouse, touch, and pen", () => {
  assert.equal(
    isPrimaryPointerInteraction({ isPrimary: true, button: 0 }),
    true
  );
});

test("rejects secondary or non-primary pointer interactions", () => {
  assert.equal(
    isPrimaryPointerInteraction({ isPrimary: false, button: 0 }),
    false
  );
  assert.equal(
    isPrimaryPointerInteraction({ isPrimary: true, button: 2 }),
    false
  );
});

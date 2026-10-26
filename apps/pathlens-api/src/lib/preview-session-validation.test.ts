import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPreviewSessionValidation,
  type PreviewSessionValidationState,
} from "./preview-session-validation";

const base: PreviewSessionValidationState = {
  exists: true,
  revokedAt: null,
  supersededAt: null,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  projectMatches: true,
  workspaceMatches: true,
  domainMatches: true,
};

test("classifies every preview session validation outcome", () => {
  const cases = [
    ["missing_session", { exists: false }],
    ["revoked", { revokedAt: new Date() }],
    ["superseded", { supersededAt: new Date() }],
    ["expired", { expiresAt: new Date("2020-01-01T00:00:00.000Z") }],
    ["project_mismatch", { projectMatches: false }],
    ["workspace_mismatch", { workspaceMatches: false }],
    ["domain_mismatch", { domainMatches: false }],
    ["successfully_validated", {}],
  ] as const;

  for (const [expected, changes] of cases) {
    assert.equal(
      classifyPreviewSessionValidation({ ...base, ...changes }),
      expected
    );
  }
});

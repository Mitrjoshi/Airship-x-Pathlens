export type PreviewSessionValidationCategory =
  | "successfully_validated"
  | "missing_session"
  | "expired"
  | "revoked"
  | "superseded"
  | "project_mismatch"
  | "workspace_mismatch"
  | "domain_mismatch";

export interface PreviewSessionValidationState {
  exists: boolean;
  revokedAt: Date | null;
  supersededAt: Date | null;
  expiresAt: Date;
  projectMatches: boolean;
  workspaceMatches: boolean;
  domainMatches: boolean;
}

export function classifyPreviewSessionValidation(
  state: PreviewSessionValidationState,
  now = Date.now()
): PreviewSessionValidationCategory {
  if (!state.exists) return "missing_session";
  if (state.revokedAt) return "revoked";
  if (state.supersededAt) return "superseded";
  if (state.expiresAt.getTime() <= now) return "expired";
  if (!state.projectMatches) return "project_mismatch";
  if (!state.workspaceMatches) return "workspace_mismatch";
  if (!state.domainMatches) return "domain_mismatch";
  return "successfully_validated";
}

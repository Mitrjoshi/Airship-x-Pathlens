import crypto from "crypto";

export function generateApiKey(prefix = "pl"): string {
  return `${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
}

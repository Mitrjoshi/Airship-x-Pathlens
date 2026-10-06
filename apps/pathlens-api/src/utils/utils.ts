import crypto from "crypto";

export function generateApiKey(prefix = "pl"): string {
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

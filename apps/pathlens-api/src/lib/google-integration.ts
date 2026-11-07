const DEFAULT_TIMEOUT_MS = 90_000;

export function getGoogleIntegrationApiKey() {
  const value = process.env.GOOGLE_INTEGRATION;
  if (!value) throw new Error("GOOGLE_INTEGRATION is required");
  return value;
}

export function getGoogleIntegrationTimeoutMs() {
  const value = Number(process.env.GOOGLE_INTEGRATION_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

export function getGoogleOAuthEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

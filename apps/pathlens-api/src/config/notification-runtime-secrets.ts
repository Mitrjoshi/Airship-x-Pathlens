import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

type SecretValue = string | Record<string, unknown>;
type RuntimeSecretOptions = {
  includeIntegrationEncryptionKey?: boolean;
};

let loadedSecrets: Promise<void> | undefined;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function getSecret(client: SecretsManagerClient, arn: string) {
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: arn })
  );
  if (!result.SecretString)
    throw new Error("The configured secret has no SecretString value.");
  try {
    return JSON.parse(result.SecretString) as SecretValue;
  } catch {
    return result.SecretString;
  }
}

function secretString(value: SecretValue, keys: string[]) {
  if (typeof value === "string") return value;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  throw new Error("The configured secret does not contain the required value.");
}

export function loadNotificationRuntimeSecrets(
  options: RuntimeSecretOptions = {}
) {
  if (loadedSecrets) return loadedSecrets;
  loadedSecrets = (async () => {
    const requiredAtRuntime =
      process.env.NOTIFICATION_REQUIRE_SECRETS === "true";
    const includeIntegrationEncryptionKey =
      options.includeIntegrationEncryptionKey === true;
    const databaseArn = process.env.DATABASE_SECRET_ARN?.trim();
    const encryptionArn = includeIntegrationEncryptionKey
      ? process.env.INTEGRATION_ENCRYPTION_KEY_SECRET_ARN?.trim()
      : undefined;
    if (!databaseArn || (includeIntegrationEncryptionKey && !encryptionArn)) {
      if (requiredAtRuntime) {
        throw new Error(
          includeIntegrationEncryptionKey
            ? "DATABASE_SECRET_ARN and INTEGRATION_ENCRYPTION_KEY_SECRET_ARN are required."
            : "DATABASE_SECRET_ARN is required."
        );
      }
      return;
    }

    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "ap-south-1",
    });
    const databaseSecretPromise = getSecret(client, databaseArn);
    const encryptionSecretPromise = encryptionArn
      ? getSecret(client, encryptionArn)
      : undefined;
    const databaseSecret = await databaseSecretPromise;
    process.env.DATABASE_URL = secretString(databaseSecret, [
      "DATABASE_URL",
      "databaseUrl",
      "url",
    ]);
    if (encryptionSecretPromise) {
      const encryptionSecret = await encryptionSecretPromise;
      process.env.INTEGRATION_ENCRYPTION_KEY = secretString(encryptionSecret, [
        "INTEGRATION_ENCRYPTION_KEY",
        "integrationEncryptionKey",
        "key",
      ]);
    }
  })();
  return loadedSecrets;
}

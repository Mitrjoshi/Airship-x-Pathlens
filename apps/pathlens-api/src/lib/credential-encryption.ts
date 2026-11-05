import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

function getEncryptionKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!value) throw new Error("INTEGRATION_ENCRYPTION_KEY is required");

  const key = /^[0-9a-f]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must encode 32 bytes");
  }
  return key;
}

export function encryptIntegrationCredentials(credentials: object) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);

  return JSON.stringify({
    version: KEY_VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
}

export function decryptIntegrationCredentials<T>(value: string): T {
  const stored = JSON.parse(value) as {
    version: number;
    iv: string;
    tag: string;
    ciphertext: string;
  };
  if (stored.version !== KEY_VERSION)
    throw new Error("Unsupported key version");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(stored.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(stored.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8")
  ) as T;
}

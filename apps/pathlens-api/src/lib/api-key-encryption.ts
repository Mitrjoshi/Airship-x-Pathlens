import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.API_KEY_ENCRYPTION_SECRET ?? process.env.INTERNAL_API_SECRET;

  if (!secret) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET or INTERNAL_API_SECRET is required"
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptApiKey(encryptedApiKey: string): string {
  const [ivValue, authTagValue, ciphertextValue] = encryptedApiKey.split(".");

  if (!ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted API key.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

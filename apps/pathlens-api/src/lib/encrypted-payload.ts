import crypto from "crypto";
import { encryptedPayloadSchema } from "@workspace/contracts/encrypted-payload";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class InvalidEncryptedPayloadError extends Error {
  constructor() {
    super("Invalid encrypted tracking payload.");
    this.name = "InvalidEncryptedPayloadError";
  }
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function decryptTrackingPayload(
  body: unknown,
  projectKey: string
): unknown {
  try {
    const envelope = encryptedPayloadSchema.parse(body);
    const iv = decodeBase64Url(envelope.iv);
    const encrypted = decodeBase64Url(envelope.ciphertext);

    if (iv.length !== IV_LENGTH || encrypted.length <= AUTH_TAG_LENGTH) {
      throw new InvalidEncryptedPayloadError();
    }

    const key = crypto.createHash("sha256").update(projectKey).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const authTag = encrypted.subarray(-AUTH_TAG_LENGTH);

    decipher.setAuthTag(authTag);

    const ciphertext = encrypted.subarray(0, -AUTH_TAG_LENGTH);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(plaintext.toString("utf8")) as unknown;
  } catch {
    throw new InvalidEncryptedPayloadError();
  }
}

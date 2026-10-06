import type { EncryptedPayload } from "@workspace/contracts/encrypted-payload";

const AES_KEY_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function deriveEncryptionKey(projectKey: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(projectKey)
  );

  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    {
      name: AES_KEY_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    false,
    ["encrypt"]
  );
}

export async function encryptPayload(
  payload: unknown,
  apiKey: string
): Promise<EncryptedPayload> {
  const plaintext = JSON.stringify(payload);

  if (plaintext === undefined) {
    throw new Error("Unable to serialize tracking payload.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveEncryptionKey(apiKey);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_KEY_ALGORITHM,
      iv,
    },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    v: 1,
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function postEncryptedPayload(
  url: string,
  apiKey: string,
  payload: unknown,
  keepalive = false
): Promise<Response> {
  const encryptedPayload = await encryptPayload(payload, apiKey);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Project-Key": apiKey,
    },
    body: JSON.stringify(encryptedPayload),
    keepalive,
  });
}

import { z } from 'zod'

const base64Url = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/)

export const encryptedPayloadSchema = z.object({
  v: z.literal(1),
  iv: base64Url,
  ciphertext: base64Url,
})

export type EncryptedPayload = z.infer<typeof encryptedPayloadSchema>

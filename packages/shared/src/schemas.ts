import { z } from "zod";
import { MAX_MEMBERS } from "./limits";
import { PERSONALIZATION_PRESET_IDS } from "./personalization";

export const memberProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(48),
  handle: z.string().min(1).max(48),
  accent: z.enum(PERSONALIZATION_PRESET_IDS),
  layout: z.enum(["constellation", "archive", "signal"]),
  photoUrl: z.string(),
  badge: z.enum(["verified"])
});

export const deviceRecordSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  label: z.string().min(1).max(80),
  verificationMethod: z.enum(["qr", "code"]),
  publicKey: z.string().min(32),
  verifiedAt: z.string().nullable(),
  revokedAt: z.string().nullable()
});

export const sessionRecordSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  createdAt: z.string().min(1),
  revokedAt: z.string().nullable()
});

export const messageEnvelopeSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  senderDeviceId: z.string().min(1),
  ciphertext: z.string().min(1),
  sentAt: z.string().min(1),
  expiresAt: z.string().nullable()
});

export const createInviteSchema = z.object({
  code: z.string().min(8).max(128),
  expiresAt: z.string().min(1),
  label: z.string().min(1).max(80)
});

export const createMessageEnvelopeSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  ciphertext: z.string().min(1),
  sentAt: z.string().min(1),
  expiresAt: z.string().nullable()
});

export const inviteRecordSchema = createInviteSchema.extend({
  createdByMemberId: z.string().min(1),
  createdAt: z.string().min(1),
  redeemedAt: z.string().nullable(),
  redeemedByMemberId: z.string().nullable()
});

export const inviteRedeemSchema = z.object({
  code: z.string().min(8).max(128),
  member: memberProfileSchema,
  device: deviceRecordSchema
});

export const deviceVerificationSchema = z.object({
  deviceId: z.string().min(1),
  method: z.enum(["qr", "code"]),
  proof: z.string().min(6),
  signature: z.string().min(32)
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1)
});

export const envelopeQuerySchema = z.object({
  roomId: z.string().min(1)
});

export const membershipCapSchema = z.number().int().max(MAX_MEMBERS);

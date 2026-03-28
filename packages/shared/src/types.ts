import type { PersonalizationPresetId } from "./personalization";

export type MemberProfile = {
  id: string;
  displayName: string;
  handle: string;
  accent: PersonalizationPresetId;
  layout: "constellation" | "archive" | "signal";
  photoUrl: string;
  badge: "verified";
};

export type DeviceRecord = {
  id: string;
  memberId: string;
  label: string;
  verificationMethod: "qr" | "code";
  publicKey: string;
  verifiedAt: string | null;
  revokedAt: string | null;
};

export type SessionRecord = {
  id: string;
  deviceId: string;
  createdAt: string;
  revokedAt: string | null;
};

export type SessionAuth = {
  sessionId: string;
  token: string;
};

export type MessageEnvelope = {
  id: string;
  roomId: string;
  senderDeviceId: string;
  ciphertext: string;
  sentAt: string;
  expiresAt: string | null;
};

export type CreateInviteInput = {
  code: string;
  expiresAt: string;
  label: string;
};

export type CreateMessageEnvelopeInput = {
  id: string;
  roomId: string;
  ciphertext: string;
  sentAt: string;
  expiresAt: string | null;
};

export type InviteRecord = CreateInviteInput & {
  createdByMemberId: string;
  createdAt: string;
  redeemedAt: string | null;
  redeemedByMemberId: string | null;
};

export type CircleAccessDeviceInput = {
  id: string;
  label: string;
  verificationMethod: "qr" | "code";
  publicKey: string;
};

export type CircleAccessEnterInput = {
  code: string;
  handle: string;
  device: CircleAccessDeviceInput;
};

export type DeviceVerificationEvent = {
  id: string;
  deviceId: string;
  method: "qr" | "code";
  proof: string;
  signature: string;
  createdAt: string;
};

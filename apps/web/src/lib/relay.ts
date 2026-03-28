import type {
  CircleAccessEnterInput,
  CreateInviteInput,
  CreateMessageEnvelopeInput,
  DeviceRecord,
  InviteRecord,
  MessageEnvelope,
  MemberProfile,
  SessionAuth,
  SessionRecord
} from "@sy-ph3r/shared";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? (import.meta.env.DEV ? "http://127.0.0.1:4300" : "");
const SESSION_STORAGE_KEY = "sy-ph3r.sessionToken";

type RedeemInvitePayload = {
  code: string;
  member: MemberProfile;
  device: DeviceRecord;
};

export type MainRoomResponse = {
  room: {
    id: string;
    title: string;
    membershipCap: number;
  };
  members: MemberProfile[];
};

export async function fetchMainRoom() {
  return request<MainRoomResponse>("/v1/rooms/main");
}

export async function createInvite(input: CreateInviteInput) {
  const result = await request<{ invite: InviteRecord }>("/v1/invites", {
    method: "POST",
    body: JSON.stringify(input),
    auth: true
  });

  return result.invite;
}

export async function redeemInvite(payload: RedeemInvitePayload) {
  return request<{
    invite: InviteRecord;
    member: MemberProfile;
    device: DeviceRecord;
    session: SessionRecord;
    auth: SessionAuth;
  }>("/v1/invites/redeem", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function enterCircle(payload: CircleAccessEnterInput) {
  return request<{
    member: MemberProfile;
    device: DeviceRecord;
    session: SessionRecord;
    auth: SessionAuth;
  }>("/v1/circle-access/enter", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyDevice(payload: {
  deviceId: string;
  method: "qr" | "code";
  proof: string;
  signature: string;
}) {
  return request<{
    accepted: boolean;
    event: {
      id: string;
      createdAt: string;
    };
  }>("/v1/devices/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function sendEnvelope(payload: CreateMessageEnvelopeInput) {
  const result = await request<{ envelope: MessageEnvelope }>("/v1/messages/envelopes", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: true
  });

  return result.envelope;
}

export async function fetchEnvelopes(roomId: string) {
  return request<{ roomId: string; items: MessageEnvelope[] }>(
    `/v1/messages/envelopes?roomId=${encodeURIComponent(roomId)}`,
    {
      auth: true
    }
  );
}

export async function bootstrapSession() {
  const result = await request<{ session: SessionRecord; auth: SessionAuth }>(
    "/v1/dev/bootstrap-session"
  );
  setSessionToken(result.auth.token);
  return result;
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

type RequestInitWithAuth = RequestInit & {
  auth?: boolean;
};

type RelayErrorPayload = {
  error?: string;
};

async function request<T>(path: string, init?: RequestInitWithAuth) {
  if (!RELAY_URL) {
    throw new Error("Missing VITE_RELAY_URL. Set the relay URL in your deployment environment.");
  }

  const token = init?.auth ? getSessionToken() : null;
  const { auth: _auth, ...requestInit } = init ?? {};
  const response = await fetch(`${RELAY_URL}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...requestInit
  });

  if (!response.ok) {
    const text = await response.text();

    if (text) {
      try {
        const parsed = JSON.parse(text) as RelayErrorPayload;
        if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch {
        throw new Error(text);
      }
    }

    throw new Error(`Relay request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

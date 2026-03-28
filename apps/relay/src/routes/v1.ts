import type { FastifyPluginAsync } from "fastify";
import { createHmac, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import {
  circleAccessEnterSchema,
  createInviteSchema,
  createMessageEnvelopeSchema,
  deviceVerificationSchema,
  envelopeQuerySchema,
  inviteRedeemSchema,
  memberProfileSchema,
  deviceRecordSchema,
  revokeSessionSchema
} from "@sy-ph3r/shared";
import type { RelayStorage } from "../domain/storage";

type RouteOptions = {
  storage: RelayStorage;
};

const operatorBootstrapProfileSchema = z.object({
  secret: z.string().min(1),
  member: memberProfileSchema,
  device: deviceRecordSchema
});

export const v1Routes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { storage } = options;
  const requireSession = async (request: any, reply: any) => {
    const session = getSessionFromRequest(storage, request.headers.authorization);
    if (!session) {
      return reply.code(401).send({ error: "Valid device session required." });
    }
  };

  app.get("/v1/dev/bootstrap-session", async (_request, reply) => {
    return reply.code(410).send({ error: "Bootstrap session flow removed. Create the first profile explicitly." });
  });

  app.post("/v1/operator/bootstrap-session", async (_request, reply) => {
    return reply.code(410).send({ error: "Bootstrap session flow removed. Use operator bootstrap profile instead." });
  });

  app.post("/v1/operator/bootstrap-profile", async (request, reply) => {
    const payload = operatorBootstrapProfileSchema.parse(request.body);
    const expectedSecret = process.env.OPERATOR_BOOTSTRAP_SECRET;

    if (!expectedSecret) {
      return reply.code(403).send({ error: "Operator bootstrap is not configured." });
    }

    if (payload.secret !== expectedSecret) {
      return reply.code(401).send({ error: "Operator secret rejected." });
    }

    if (storage.listRoomMembers().length > 0) {
      return reply.code(409).send({ error: "The first profile already exists." });
    }

    const created = storage.createInitialProfile(payload.member, payload.device);
    if (!created) {
      return reply.code(400).send({ error: "Could not create the first profile." });
    }

    return reply.code(201).send(created);
  });

  app.post("/v1/invites", { preHandler: requireSession }, async (request, reply) => {
    const room = storage.getMainRoom();
    const memberCount = storage.listRoomMembers().length;
    if (memberCount >= room.membershipCap) {
      return reply.code(409).send({ error: "The circle is already full." });
    }

    const session = getSessionFromRequest(storage, request.headers.authorization);
    const device = session ? storage.getDevice(session.deviceId) : null;
    if (!device) {
      return reply.code(401).send({ error: "Valid device session required." });
    }

    const payload = createInviteSchema.parse(request.body);
    const created = storage.createInvite(payload, device.memberId);

    return reply.code(201).send({
      invite: created,
      note: "Invite metadata created. Distribution should happen out-of-band."
    });
  });

  app.post("/v1/invites/redeem", async (request, reply) => {
    const room = storage.getMainRoom();
    const memberCount = storage.listRoomMembers().length;
    if (memberCount >= room.membershipCap) {
      return reply.code(409).send({ error: "The circle is already full." });
    }

    const payload = inviteRedeemSchema.parse(request.body);
    const result = storage.redeemInvite(payload.code, payload.member, payload.device);

    if (!result) {
      return reply.code(404).send({ error: "Invite not found or already redeemed." });
    }

    return reply.code(201).send(result);
  });

  app.post("/v1/circle-access/enter", async (request, reply) => {
    const payload = circleAccessEnterSchema.parse(request.body);
    const configuredSecret = process.env.CIRCLE_CODE_SECRET ?? process.env.SESSION_SECRET;

    if (!configuredSecret) {
      return reply.code(503).send({ error: "Circle code access is not configured." });
    }

    if (!isValidCircleCode(payload.code, configuredSecret)) {
      return reply.code(401).send({ error: "Circle access code rejected." });
    }

    const member = storage.findMemberByHandle(payload.handle);
    if (!member) {
      return reply.code(404).send({ error: "Member not found for this circle." });
    }

    const entered = storage.enterCircle(member.id, {
      id: payload.device.id,
      memberId: member.id,
      label: payload.device.label,
      verificationMethod: payload.device.verificationMethod,
      publicKey: payload.device.publicKey,
      verifiedAt: null,
      revokedAt: null
    });

    if (!entered) {
      return reply.code(400).send({ error: "Could not enter the circle on this device." });
    }

    return reply.code(201).send(entered);
  });

  app.post("/v1/devices/verify", async (request, reply) => {
    const payload = deviceVerificationSchema.parse(request.body);
    const device = storage.getDevice(payload.deviceId);

    if (!device) {
      return reply.code(404).send({ error: "Device not found." });
    }

    const signed = verifyDeviceProof({
      deviceId: payload.deviceId,
      proof: payload.proof,
      signature: payload.signature,
      publicKey: device.publicKey
    });
    if (!signed) {
      return reply.code(400).send({ error: "Device signature verification failed." });
    }

    const event = storage.verifyDevice(payload);

    return reply.code(202).send({
      accepted: true,
      verification: payload,
      event,
      note: "Verification event accepted and signed against the registered device public key."
    });
  });

  app.post("/v1/sessions/revoke", { preHandler: requireSession }, async (request, reply) => {
    const payload = revokeSessionSchema.parse(request.body);
    const revoked = storage.revokeSession(payload.sessionId);

    if (!revoked) {
      return reply.code(404).send({ error: "Session not found." });
    }

    return { session: revoked };
  });

  app.get("/v1/rooms/main", async () => ({
    room: storage.getMainRoom(),
    members: storage.listRoomMembers()
  }));

  app.post("/v1/messages/envelopes", { preHandler: requireSession }, async (request, reply) => {
    const session = getSessionFromRequest(storage, request.headers.authorization);
    if (!session) {
      return reply.code(401).send({ error: "Valid device session required." });
    }

    const payload = createMessageEnvelopeSchema.parse(request.body);
    const stored = storage.upsertEnvelope(payload, session.deviceId);

    return reply.code(202).send({
      envelope: stored,
      note: "Ciphertext accepted by relay."
    });
  });

  app.get("/v1/messages/envelopes", { preHandler: requireSession }, async (request) => {
    const query = envelopeQuerySchema.parse(request.query);

    return {
      roomId: query.roomId,
      items: storage.getEnvelopes(query.roomId)
    };
  });
};

function getSessionFromRequest(storage: RelayStorage, authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return storage.authenticateSessionToken(authorization.slice("Bearer ".length));
}

function verifyDeviceProof(payload: {
  deviceId: string;
  proof: string;
  signature: string;
  publicKey: string;
}) {
  const publicKey = createPublicKey({
    key: Buffer.from(payload.publicKey, "base64"),
    format: "der",
    type: "spki"
  });

  return verify(
    null,
    Buffer.from(`${payload.deviceId}:${payload.proof}`),
    publicKey,
    Buffer.from(payload.signature, "base64")
  );
}

function isValidCircleCode(input: string, secret: string) {
  const normalizedInput = normalizeCircleCode(input);
  const currentWindow = Math.floor(Date.now() / (2 * 60 * 60 * 1000));

  for (const windowOffset of [0, -1]) {
    const candidate = buildCircleCode(secret, currentWindow + windowOffset);
    if (candidate === normalizedInput) {
      return true;
    }
  }

  return false;
}

function buildCircleCode(secret: string, windowSlot: number) {
  const material = createHmac("sha256", secret).update(`circle:${windowSlot}`).digest("base64url");
  const compact = material.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

function normalizeCircleCode(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

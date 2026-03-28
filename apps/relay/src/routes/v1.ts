import type { FastifyPluginAsync } from "fastify";
import { createPublicKey, verify } from "node:crypto";
import {
  createInviteSchema,
  createMessageEnvelopeSchema,
  deviceVerificationSchema,
  envelopeQuerySchema,
  inviteRedeemSchema,
  revokeSessionSchema
} from "@sy-ph3r/shared";
import type { RelayStorage } from "../domain/storage";

type RouteOptions = {
  storage: RelayStorage;
};

export const v1Routes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { storage } = options;
  const requireSession = async (request: any, reply: any) => {
    const session = getSessionFromRequest(storage, request.headers.authorization);
    if (!session) {
      return reply.code(401).send({ error: "Valid device session required." });
    }
  };

  app.get("/v1/dev/bootstrap-session", async (_request, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "Bootstrap session unavailable outside development." });
    }

    const issued = storage.issueSession("device_iris_studio");
    if (!issued) {
      return reply.code(404).send({ error: "Bootstrap device not found." });
    }

    return reply.code(201).send(issued);
  });

  app.post("/v1/operator/bootstrap-session", async (request, reply) => {
    const payload = request.body as { secret?: string } | undefined;
    const expectedSecret = process.env.OPERATOR_BOOTSTRAP_SECRET;

    if (!expectedSecret) {
      return reply.code(403).send({ error: "Operator bootstrap is not configured." });
    }

    if (payload?.secret !== expectedSecret) {
      return reply.code(401).send({ error: "Operator secret rejected." });
    }

    const issued = storage.issueSession("device_iris_studio");
    if (!issued) {
      return reply.code(404).send({ error: "Bootstrap device not found." });
    }

    return reply.code(201).send(issued);
  });

  app.post("/v1/invites", { preHandler: requireSession }, async (request, reply) => {
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
    const payload = inviteRedeemSchema.parse(request.body);
    const result = storage.redeemInvite(payload.code, payload.member, payload.device);

    if (!result) {
      return reply.code(404).send({ error: "Invite not found or already redeemed." });
    }

    return reply.code(201).send(result);
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

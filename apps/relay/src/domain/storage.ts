import Database from "better-sqlite3";
import { createHash, randomBytes } from "node:crypto";
import type {
  CreateInviteInput,
  CreateMessageEnvelopeInput,
  DeviceRecord,
  DeviceVerificationEvent,
  InviteRecord,
  MemberProfile,
  MessageEnvelope,
  SessionAuth,
  SessionRecord
} from "@sy-ph3r/shared";

type RoomRecord = {
  id: string;
  title: string;
  membershipCap: number;
};

type RedeemInviteResult = {
  invite: InviteRecord;
  member: MemberProfile;
  device: DeviceRecord;
  session: SessionRecord;
  auth: SessionAuth;
};

export type RelayStorage = {
  createInvite(input: CreateInviteInput, createdByMemberId: string): InviteRecord;
  redeemInvite(code: string, member: MemberProfile, device: DeviceRecord): RedeemInviteResult | null;
  getDevice(deviceId: string): DeviceRecord | null;
  verifyDevice(event: Omit<DeviceVerificationEvent, "id" | "createdAt">): DeviceVerificationEvent | null;
  authenticateSessionToken(token: string): SessionRecord | null;
  issueSession(deviceId: string): { session: SessionRecord; auth: SessionAuth } | null;
  listRoomMembers(): MemberProfile[];
  getMainRoom(): RoomRecord;
  upsertEnvelope(input: CreateMessageEnvelopeInput, senderDeviceId: string): MessageEnvelope;
  getEnvelopes(roomId: string): MessageEnvelope[];
  revokeSession(sessionId: string): SessionRecord | null;
};

type SqliteOptions = {
  dbPath: string;
};

export function createSqliteStorage(options: SqliteOptions): RelayStorage {
  const db = new Database(options.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeSchema(db);
  seedBootstrapState(db);

  const insertInvite = db.prepare(`
    INSERT INTO invites (code, created_by_member_id, expires_at, label, created_at, redeemed_at, redeemed_by_member_id)
    VALUES (@code, @createdByMemberId, @expiresAt, @label, @createdAt, NULL, NULL)
  `);

  const findInvite = db.prepare(`
    SELECT
      code,
      created_by_member_id AS createdByMemberId,
      expires_at AS expiresAt,
      label,
      created_at AS createdAt,
      redeemed_at AS redeemedAt,
      redeemed_by_member_id AS redeemedByMemberId
    FROM invites
    WHERE code = ?
  `);

  const updateInviteRedemption = db.prepare(`
    UPDATE invites
    SET redeemed_at = @redeemedAt, redeemed_by_member_id = @redeemedByMemberId
    WHERE code = @code
  `);

  const insertMember = db.prepare(`
    INSERT INTO members (id, display_name, handle, accent, layout, photo_url, badge)
    VALUES (@id, @displayName, @handle, @accent, @layout, @photoUrl, @badge)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      handle = excluded.handle,
      accent = excluded.accent,
      layout = excluded.layout,
      photo_url = excluded.photo_url,
      badge = excluded.badge
  `);

  const insertDevice = db.prepare(`
    INSERT INTO devices (id, member_id, label, verification_method, public_key, verified_at, revoked_at)
    VALUES (@id, @memberId, @label, @verificationMethod, @publicKey, @verifiedAt, @revokedAt)
    ON CONFLICT(id) DO UPDATE SET
      member_id = excluded.member_id,
      label = excluded.label,
      verification_method = excluded.verification_method,
      public_key = excluded.public_key,
      verified_at = excluded.verified_at,
      revoked_at = excluded.revoked_at
  `);

  const findDevice = db.prepare(`
    SELECT
      id,
      member_id AS memberId,
      label,
      verification_method AS verificationMethod,
      public_key AS publicKey,
      verified_at AS verifiedAt,
      revoked_at AS revokedAt
    FROM devices
    WHERE id = ?
  `);

  const verifyDeviceStatement = db.prepare(`
    UPDATE devices
    SET verified_at = @verifiedAt
    WHERE id = @deviceId
  `);

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, device_id, token_hash, created_at, revoked_at)
    VALUES (@id, @deviceId, @tokenHash, @createdAt, @revokedAt)
  `);

  const findSessionByTokenHash = db.prepare(`
    SELECT
      id,
      device_id AS deviceId,
      created_at AS createdAt,
      revoked_at AS revokedAt
    FROM sessions
    WHERE token_hash = ? AND revoked_at IS NULL
  `);

  const updateSessionRevocation = db.prepare(`
    UPDATE sessions
    SET revoked_at = @revokedAt
    WHERE id = @sessionId
  `);

  const findSession = db.prepare(`
    SELECT
      id,
      device_id AS deviceId,
      created_at AS createdAt,
      revoked_at AS revokedAt
    FROM sessions
    WHERE id = ?
  `);

  const listMembersStatement = db.prepare(`
    SELECT
      id,
      display_name AS displayName,
      handle,
      accent,
      layout,
      photo_url AS photoUrl,
      badge
    FROM members
    ORDER BY rowid ASC
  `);

  const getMainRoomStatement = db.prepare(`
    SELECT
      id,
      title,
      membership_cap AS membershipCap
    FROM rooms
    WHERE id = 'room_main'
  `);

  const insertEnvelope = db.prepare(`
    INSERT INTO envelopes (id, room_id, sender_device_id, ciphertext, sent_at, expires_at)
    VALUES (@id, @roomId, @senderDeviceId, @ciphertext, @sentAt, @expiresAt)
    ON CONFLICT(id) DO UPDATE SET
      room_id = excluded.room_id,
      sender_device_id = excluded.sender_device_id,
      ciphertext = excluded.ciphertext,
      sent_at = excluded.sent_at,
      expires_at = excluded.expires_at
  `);

  const listEnvelopesStatement = db.prepare(`
    SELECT
      id,
      room_id AS roomId,
      sender_device_id AS senderDeviceId,
      ciphertext,
      sent_at AS sentAt,
      expires_at AS expiresAt
    FROM envelopes
    WHERE room_id = ?
    ORDER BY rowid ASC
  `);

  const insertVerificationEvent = db.prepare(`
    INSERT INTO verification_events (id, device_id, method, proof, signature, created_at)
    VALUES (@id, @deviceId, @method, @proof, @signature, @createdAt)
  `);

  const redeemInviteTransaction = db.transaction(
    (code: string, member: MemberProfile, device: DeviceRecord): RedeemInviteResult | null => {
      const invite = findInvite.get(code) as InviteRecord | undefined;

      if (!invite || invite.redeemedAt || new Date(invite.expiresAt).getTime() < Date.now()) {
        return null;
      }

      insertMember.run(member);
      insertDevice.run(device);

      const issued = issueSessionInternal(device.id);
      if (!issued) {
        return null;
      }

      const redeemedAt = new Date().toISOString();
      updateInviteRedemption.run({
        code,
        redeemedAt,
        redeemedByMemberId: member.id
      });

      return {
        invite: {
          ...invite,
          redeemedAt,
          redeemedByMemberId: member.id
        },
        member,
        device,
        session: issued.session,
        auth: issued.auth
      };
    }
  );

  return {
    createInvite(input, createdByMemberId) {
      const invite: InviteRecord = {
        ...input,
        createdByMemberId,
        createdAt: new Date().toISOString(),
        redeemedAt: null,
        redeemedByMemberId: null
      };

      insertInvite.run(invite);
      return invite;
    },
    redeemInvite(code, member, device) {
      return redeemInviteTransaction(code, member, device);
    },
    getDevice(deviceId) {
      return (findDevice.get(deviceId) as DeviceRecord | undefined) ?? null;
    },
    verifyDevice(event) {
      const current = findDevice.get(event.deviceId) as DeviceRecord | undefined;
      if (!current) {
        return null;
      }

      const createdAt = new Date().toISOString();
      verifyDeviceStatement.run({ deviceId: event.deviceId, verifiedAt: createdAt });

      const verificationEvent: DeviceVerificationEvent = {
        id: `verify_${randomBytes(8).toString("hex")}`,
        deviceId: event.deviceId,
        method: event.method,
        proof: event.proof,
        signature: event.signature,
        createdAt
      };

      insertVerificationEvent.run(verificationEvent);
      return verificationEvent;
    },
    authenticateSessionToken(token) {
      const tokenHash = hashToken(token);
      return (findSessionByTokenHash.get(tokenHash) as SessionRecord | undefined) ?? null;
    },
    issueSession(deviceId) {
      return issueSessionInternal(deviceId);
    },
    listRoomMembers() {
      return listMembersStatement.all() as MemberProfile[];
    },
    getMainRoom() {
      return getMainRoomStatement.get() as RoomRecord;
    },
    upsertEnvelope(input, senderDeviceId) {
      const envelope: MessageEnvelope = {
        ...input,
        senderDeviceId
      };
      insertEnvelope.run(envelope);
      return envelope;
    },
    getEnvelopes(roomId) {
      return listEnvelopesStatement.all(roomId) as MessageEnvelope[];
    },
    revokeSession(sessionId) {
      const current = findSession.get(sessionId) as SessionRecord | undefined;
      if (!current) {
        return null;
      }

      const revokedAt = new Date().toISOString();
      updateSessionRevocation.run({ sessionId, revokedAt });
      return {
        ...current,
        revokedAt
      };
    }
  };

  function issueSessionInternal(deviceId: string) {
    const device = findDevice.get(deviceId) as DeviceRecord | undefined;
    if (!device || device.revokedAt) {
      return null;
    }

    const token = randomBytes(32).toString("base64url");
    const session: SessionRecord = {
      id: `session_${randomBytes(8).toString("hex")}`,
      deviceId,
      createdAt: new Date().toISOString(),
      revokedAt: null
    };

    insertSession.run({
      ...session,
      tokenHash: hashToken(token)
    });

    return {
      session,
      auth: {
        sessionId: session.id,
        token
      }
    };
  }
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      membership_cap INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      created_by_member_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      redeemed_at TEXT,
      redeemed_by_member_id TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      accent TEXT NOT NULL,
      layout TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      badge TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      label TEXT NOT NULL,
      verification_method TEXT NOT NULL,
      public_key TEXT NOT NULL,
      verified_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY(member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS envelopes (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_device_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      expires_at TEXT,
      FOREIGN KEY(sender_device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS verification_events (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      method TEXT NOT NULL,
      proof TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(device_id) REFERENCES devices(id)
    );
  `);

  ensureColumn(db, "devices", "public_key", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "sessions", "token_hash", "TEXT NOT NULL DEFAULT ''");
}

function seedBootstrapState(db: Database.Database) {
  const roomCount = db.prepare("SELECT COUNT(*) AS count FROM rooms").get() as { count: number };
  if (roomCount.count === 0) {
    db.prepare(`
      INSERT INTO rooms (id, title, membership_cap)
      VALUES ('room_main', 'The Quiet Room', 5)
    `).run();
  }

  const memberCount = db.prepare("SELECT COUNT(*) AS count FROM members").get() as { count: number };
  if (memberCount.count > 0) {
    return;
  }

  db.prepare(`
    INSERT INTO members (id, display_name, handle, accent, layout, photo_url, badge)
    VALUES ('member_iris', 'Iris', 'observer', 'sea-glow', 'constellation', '', 'founding')
  `).run();

  db.prepare(`
    INSERT INTO devices (id, member_id, label, verification_method, public_key, verified_at, revoked_at)
    VALUES ('device_iris_studio', 'member_iris', 'Iris / Studio Mac', 'qr', @publicKey, @verifiedAt, NULL)
  `).run({
    publicKey: "bootstrap-public-key-placeholder",
    verifiedAt: new Date().toISOString()
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

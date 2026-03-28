import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  type DeviceRecord,
  type InviteRecord,
  type MemberProfile,
  type MessageEnvelope,
  type PersonalizationPresetId
} from "@sy-ph3r/shared";
import { AppShell } from "./components/ui/app-shell";
import { CyberButton } from "./components/ui/cyber-button";
import { MessageItem } from "./components/ui/message-item";
import { SecurityStatusBadge } from "./components/ui/security-status-badge";
import {
  ActionCard,
  CalmPanel,
  Chip,
  ComposerDock,
  EmptyPanel,
  MemberPill,
  MiniSignal,
  ResultBlock,
  SectionHeader,
  StatPanel,
  StatusCard,
  ViewTabs
} from "./components/ui/surface-primitives";
import { EMPTY_DRAFT_VAULT, upsertDraft, type DraftRecord, type DraftVaultState } from "./domain/drafts";
import { createDeviceIdentity, signDeviceProof } from "./lib/deviceIdentity";
import { hasStoredDraftVault, loadDraftVault, saveDraftVault } from "./lib/localVault";
import { decryptRoomMessage, encryptRoomMessage } from "./lib/messageCrypto";
import {
  bootstrapSession,
  createInvite,
  fetchEnvelopes,
  fetchMainRoom,
  getSessionToken,
  redeemInvite,
  sendEnvelope,
  setSessionToken,
  verifyDevice
} from "./lib/relay";

type CreateInviteForm = {
  label: string;
  createdByMemberId: string;
  expiresAt: string;
};

type RedeemInviteForm = {
  code: string;
  displayName: string;
  handle: string;
  accent: PersonalizationPresetId;
  layout: "constellation" | "archive" | "signal";
  deviceLabel: string;
  verificationMethod: "qr" | "code";
};

type VerifyForm = {
  deviceId: string;
  method: "qr" | "code";
  proof: string;
};

type DraftComposerState = {
  body: string;
  disappearingWindow: DraftRecord["disappearingWindow"];
};

type MainRoomResponse = {
  room: {
    id: string;
    title: string;
    membershipCap: number;
  };
  members: MemberProfile[];
};

type DecryptedRoomMessage = {
  envelopeId: string;
  senderDeviceId: string;
  body: string;
  sentAt: string;
  expiresAt: string | null;
};

type DirectMessageState = {
  recipientId: string;
  secret: string;
  body: string;
  status: string;
  envelopes: MessageEnvelope[];
  messages: DecryptedRoomMessage[];
};

type AppView = "home" | "getting-started" | "room" | "direct" | "identity" | "security";

type UiThemeId =
  | "signal-core"
  | "ghost-terminal"
  | "gridline"
  | "blacksite"
  | "cipher-pulse"
  | "runner"
  | "stealth-node"
  | "emerald-static";

const initialInviteForm: CreateInviteForm = {
  label: "Member slot 02",
  createdByMemberId: "member_iris",
  expiresAt: getDefaultExpiry()
};

const initialRedeemForm: RedeemInviteForm = {
  code: "",
  displayName: "",
  handle: "",
  accent: "sea-glow",
  layout: "constellation",
  deviceLabel: "New device",
  verificationMethod: "qr"
};

const initialVerifyForm: VerifyForm = {
  deviceId: "",
  method: "qr",
  proof: "room-seal-001"
};

const initialDraftComposer: DraftComposerState = {
  body: "",
  disappearingWindow: "24h"
};

const UI_THEME_PRESETS: Array<{
  id: UiThemeId;
  label: string;
  description: string;
  primary: string;
  secondary: string;
}> = [
  {
    id: "signal-core",
    label: "Signal Core",
    description: "Balanced green signal channels and clean shell contrast.",
    primary: "#7cff6b",
    secondary: "#3dffb3"
  },
  {
    id: "ghost-terminal",
    label: "Ghost Terminal",
    description: "Cooler interface glow with pale terminal edges.",
    primary: "#9cffc9",
    secondary: "#9de7ff"
  },
  {
    id: "gridline",
    label: "Gridline",
    description: "Sharper grid emphasis and tighter divider contrast.",
    primary: "#8dff72",
    secondary: "#6fffd3"
  },
  {
    id: "blacksite",
    label: "Blacksite",
    description: "Low-visibility shell with dense dark surfaces.",
    primary: "#9fa59f",
    secondary: "#6a716a"
  },
  {
    id: "cipher-pulse",
    label: "Cipher Pulse",
    description: "Brighter active accents and stronger pulse highlights.",
    primary: "#ffe84d",
    secondary: "#ffd447"
  },
  {
    id: "runner",
    label: "Runner",
    description: "Fast neon edge treatment with lighter motion energy.",
    primary: "#ff4d4d",
    secondary: "#ff7a47"
  },
  {
    id: "stealth-node",
    label: "Stealth Node",
    description: "Muted shell presence and restrained signal lines.",
    primary: "#d3d8de",
    secondary: "#a4adb8"
  },
  {
    id: "emerald-static",
    label: "Emerald Static",
    description: "Classic black-and-green identity with richer binary haze.",
    primary: "#7cff6b",
    secondary: "#3dffb3"
  }
];

function App() {
  const [view, setView] = useState<AppView>("home");
  const [appReady, setAppReady] = useState(false);
  const [room, setRoom] = useState<MainRoomResponse | null>(null);
  const [inviteForm, setInviteForm] = useState<CreateInviteForm>(initialInviteForm);
  const [redeemForm, setRedeemForm] = useState<RedeemInviteForm>(initialRedeemForm);
  const [verifyForm, setVerifyForm] = useState<VerifyForm>(initialVerifyForm);
  const [createdInvite, setCreatedInvite] = useState<InviteRecord | null>(null);
  const [pendingDevice, setPendingDevice] = useState<DeviceRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("operator.link // awaiting");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionReady, setSessionReady] = useState(Boolean(getSessionToken()));
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultState, setVaultState] = useState<DraftVaultState>(EMPTY_DRAFT_VAULT);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultStatus, setVaultStatus] = useState(
    hasStoredDraftVault() ? "vault.detected // locked" : "vault.absent // initialize"
  );
  const [draftComposer, setDraftComposer] = useState<DraftComposerState>(initialDraftComposer);
  const [roomSecret, setRoomSecret] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [activeTheme, setActiveTheme] = useState<UiThemeId>("emerald-static");
  const [cipherEnvelopes, setCipherEnvelopes] = useState<MessageEnvelope[]>([]);
  const [roomMessages, setRoomMessages] = useState<DecryptedRoomMessage[]>([]);
  const [messageStatus, setMessageStatus] = useState("room.locked // secret required");
  const [dmState, setDmState] = useState<DirectMessageState>({
    recipientId: "",
    secret: "",
    body: "",
    status: "dm.idle // select member",
    envelopes: [],
    messages: []
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const startedAt = Date.now();

      await refreshRoom();

      if (!getSessionToken()) {
        await ensureBootstrapSession();
      } else {
        await refreshMessages(roomSecret);
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < 1400) {
        await wait(1400 - elapsed);
      }

      if (!cancelled) {
        setAppReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function ensureBootstrapSession() {
    try {
      const result = await bootstrapSession();
      setSessionToken(result.auth.token);
      setSessionReady(true);
      setStatusMessage("operator.link // established");
      setErrorMessage("");
      await refreshMessages(roomSecret);
      if (dmState.recipientId) {
        await refreshDirectMessages(dmState.recipientId, dmState.secret);
      }
    } catch (error) {
      setErrorMessage(toMessage(error));
      setStatusMessage("operator.link // failed");
    }
  }

  async function refreshRoom() {
    try {
      const nextRoom = await fetchMainRoom();
      setRoom(nextRoom);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(toMessage(error));
    }
  }

  async function refreshMessages(secret: string) {
    if (!getSessionToken()) {
      setMessageStatus("room.sync // session required");
      return;
    }

    try {
      const result = await fetchEnvelopes("room_main");
      setCipherEnvelopes(result.items);

      if (!secret) {
        setRoomMessages([]);
        setMessageStatus("room.locked // secret required");
        return;
      }

      const decrypted = await Promise.all(
        result.items.map(async (item) => ({
          envelopeId: item.id,
          senderDeviceId: item.senderDeviceId,
          body: await decryptRoomMessage(secret, item.ciphertext),
          sentAt: item.sentAt,
          expiresAt: item.expiresAt
        }))
      );

      setRoomMessages(decrypted.reverse());
      setMessageStatus(`room.sync // ${decrypted.length} decrypted`);
    } catch (error) {
      setRoomMessages([]);
      setMessageStatus(toMessage(error));
    }
  }

  async function refreshDirectMessages(recipientId: string, secret: string) {
    if (!recipientId) {
      setDmState((current) => ({
        ...current,
        status: "dm.idle // select member",
        envelopes: [],
        messages: []
      }));
      return;
    }

    if (!getSessionToken()) {
      setDmState((current) => ({
        ...current,
        status: "dm.sync // session required"
      }));
      return;
    }

    try {
      const result = await fetchEnvelopes(getDirectRoomId(recipientId));

      if (!secret) {
        setDmState((current) => ({
          ...current,
          envelopes: result.items,
          messages: [],
          status: "dm.locked // secret required"
        }));
        return;
      }

      const decrypted = await Promise.all(
        result.items.map(async (item) => ({
          envelopeId: item.id,
          senderDeviceId: item.senderDeviceId,
          body: await decryptRoomMessage(secret, item.ciphertext),
          sentAt: item.sentAt,
          expiresAt: item.expiresAt
        }))
      );

      setDmState((current) => ({
        ...current,
        envelopes: result.items,
        messages: decrypted.reverse(),
        status: `dm.sync // ${decrypted.length} decrypted`
      }));
    } catch (error) {
      setDmState((current) => ({
        ...current,
        messages: [],
        status: toMessage(error)
      }));
    }
  }

  function handleCreateInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const invite = await createInvite({
          code: `invite_${crypto.randomUUID()}`,
          createdByMemberId: inviteForm.createdByMemberId,
          expiresAt: new Date(inviteForm.expiresAt).toISOString(),
          label: inviteForm.label
        });

        setCreatedInvite(invite);
        setRedeemForm((current) => ({ ...current, code: invite.code }));
        setStatusMessage(`invite.issued // ${invite.label}`);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(toMessage(error));
      }
    });
  }

  function handleRedeemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const memberId = `member_${crypto.randomUUID()}`;
        const deviceId = `device_${crypto.randomUUID()}`;
        const identity = await createDeviceIdentity(deviceId);
        const result = await redeemInvite({
          code: redeemForm.code,
          member: {
            id: memberId,
            displayName: redeemForm.displayName,
            handle: redeemForm.handle,
            accent: redeemForm.accent,
            layout: redeemForm.layout,
            photoUrl: "",
            badge: "verified"
          },
          device: {
            id: deviceId,
            memberId,
            label: redeemForm.deviceLabel,
            verificationMethod: redeemForm.verificationMethod,
            publicKey: identity.publicKey,
            verifiedAt: null,
            revokedAt: null
          }
        });

        setSessionToken(result.auth.token);
        setSessionReady(true);
        setPendingDevice(result.device);
        setVerifyForm({
          deviceId: result.device.id,
          method: result.device.verificationMethod,
          proof: "room-seal-001"
        });
        setStatusMessage(`member.joined // ${result.member.displayName}`);
        setErrorMessage("");
        await refreshRoom();
        await refreshMessages(roomSecret);
        if (dmState.recipientId) {
          await refreshDirectMessages(dmState.recipientId, dmState.secret);
        }
      } catch (error) {
        setErrorMessage(toMessage(error));
      }
    });
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const signature = await signDeviceProof(verifyForm.deviceId, verifyForm.proof);
        const result = await verifyDevice({
          ...verifyForm,
          signature
        });
        setStatusMessage(`device.verify // ${formatTimestamp(result.event.createdAt)}`);
        setErrorMessage("");
        await refreshRoom();
      } catch (error) {
        setErrorMessage(toMessage(error));
      }
    });
  }

  function handleVaultUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const restored = await loadDraftVault(vaultPassphrase);
        setVaultState(restored);
        setVaultUnlocked(true);
        setVaultStatus(`vault.unlocked // ${restored.drafts.length} draft(s)`);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(toMessage(error));
      }
    });
  }

  function handleDraftSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!vaultPassphrase) {
          throw new Error("vault.passphrase // required");
        }

        const nextState = upsertDraft(vaultState, {
          id: "draft_room_main",
          roomId: "room_main",
          body: draftComposer.body,
          disappearingWindow: draftComposer.disappearingWindow
        });

        await saveDraftVault(vaultPassphrase, nextState);
        setVaultState(nextState);
        setVaultUnlocked(true);
        setVaultStatus("vault.write // encrypted");
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(toMessage(error));
      }
    });
  }

  function handleRoomUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await refreshMessages(roomSecret);
    });
  }

  function handleDirectUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await refreshDirectMessages(dmState.recipientId, dmState.secret);
    });
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!roomSecret) {
          throw new Error("room.secret // required");
        }

        if (!getSessionToken()) {
          throw new Error("session.token // required");
        }

        const senderDeviceId = pendingDevice?.id ?? "device_iris_studio";
        const ciphertext = await encryptRoomMessage(roomSecret, messageBody);
        await sendEnvelope({
          id: `env_${crypto.randomUUID()}`,
          roomId: "room_main",
          senderDeviceId,
          ciphertext,
          sentAt: new Date().toISOString(),
          expiresAt: draftComposer.disappearingWindow === "off" ? null : draftComposer.disappearingWindow
        });

        setMessageBody("");
        setMessageStatus("room.send // envelope sealed");
        await refreshMessages(roomSecret);
      } catch (error) {
        setMessageStatus(toMessage(error));
      }
    });
  }

  function handleSendDirectMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!dmState.recipientId) {
          throw new Error("dm.recipient // required");
        }

        if (!dmState.secret) {
          throw new Error("dm.secret // required");
        }

        if (!getSessionToken()) {
          throw new Error("session.token // required");
        }

        const senderDeviceId = pendingDevice?.id ?? "device_iris_studio";
        const ciphertext = await encryptRoomMessage(dmState.secret, dmState.body);
        await sendEnvelope({
          id: `env_${crypto.randomUUID()}`,
          roomId: getDirectRoomId(dmState.recipientId),
          senderDeviceId,
          ciphertext,
          sentAt: new Date().toISOString(),
          expiresAt: null
        });

        setDmState((current) => ({
          ...current,
          body: "",
          status: "dm.send // envelope sealed"
        }));
        await refreshDirectMessages(dmState.recipientId, dmState.secret);
      } catch (error) {
        setDmState((current) => ({
          ...current,
          status: toMessage(error)
        }));
      }
    });
  }

  const memberCount = room?.members.length ?? 0;
  const members = room?.members ?? [];
  const currentMember = members.find((member) => member.id === pendingDevice?.memberId) ?? members[0] ?? null;
  const selectedDirectName = dmState.recipientId ? resolveMemberName(members, dmState.recipientId) : "No member selected";
  const activePreset = UI_THEME_PRESETS.find((preset) => preset.id === activeTheme) ?? UI_THEME_PRESETS[0];

  return (
    <AppShell theme={activeTheme}>
      {!appReady ? <LoadingScreen /> : null}
      <motion.header
        className="sy-shell rounded-[32px] border border-border p-6 md:p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <p className="sy-terminal-label">SY-PH3R</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold uppercase tracking-[0.14em] text-text-primary md:text-6xl">
                Blacksite Signal
              </h1>
              <SecurityStatusBadge label={statusMessage} tone="secure" />
            </div>
            <div className="flex flex-wrap gap-3">
              <SecurityStatusBadge label={sessionReady ? "session ready" : "session pending"} tone="active" />
              <SecurityStatusBadge label={`${memberCount}/5 members`} tone="alert" />
              <SecurityStatusBadge label={vaultUnlocked ? "vault unlocked" : "vault locked"} tone="active" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <MiniSignal label="Room" value={room?.room.title ?? "room_main"} />
            <MiniSignal label="Feed" value={`${cipherEnvelopes.length} envelopes`} />
            <MiniSignal label="Direct" value={dmState.recipientId ? selectedDirectName : "Idle"} />
          </div>
        </div>
      </motion.header>
      <ViewTabs
        items={[
          { id: "home", label: "Home" },
          { id: "getting-started", label: "Guide" },
          { id: "room", label: "Room" },
          { id: "direct", label: "Direct" },
          { id: "identity", label: "Identity" },
          { id: "security", label: "Security" }
        ]}
        view={view}
        onChange={setView}
      />

      {view === "home" ? (
        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <CalmPanel title="Home" subtitle="Private room">
            <div className="grid gap-6">
              <SectionHeader
                title="Dashboard"
                subtitle=""
                aside={<Chip text={`${memberCount}/5 active`} />}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <ActionCard title="Open Room" description="Shared thread" onClick={() => setView("room")} />
                <ActionCard title="Direct Thread" description="Private conversation" onClick={() => setView("direct")} />
                <ActionCard title="Security" description="Access controls" onClick={() => setView("security")} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <StatPanel label="Messages" value={`${roomMessages.length}`} meta="decrypted in room" />
                <StatPanel label="Members" value={`${memberCount}/5`} meta="approved circle" />
                <StatPanel label="Theme" value={activePreset.label} meta="active preset" />
              </div>
            </div>
          </CalmPanel>

          <CalmPanel title="Presence" subtitle="Members">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {members.length === 0 ? (
                <EmptyPanel text="No approved members loaded yet." />
              ) : (
                members.map((member) => (
                  <div key={member.id} className="sy-info-card rounded-[24px] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-medium tracking-[0.04em] text-text-primary">{member.displayName}</p>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-secondary">
                          @{member.handle}
                        </p>
                      </div>
                      <SecurityStatusBadge label={member.badge} tone="active" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CalmPanel>
        </section>
      ) : null}

      {view === "getting-started" ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <CalmPanel title="Getting Started" subtitle="User flow">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Create or receive an invite.",
                "Redeem the invite on this device.",
                "Verify the device with a secure code or QR flow.",
                "Unlock the room or a direct thread with the shared secret.",
                "Read messages in the main timeline and send from the composer at the bottom.",
                "Use Security for invites, vault access, and device status."
              ].map((step, index) => (
                <div key={step} className="sy-step-card rounded-[24px] px-4 py-4">
                  <div className="flex items-start gap-4">
                    <div className="sy-step-index">{index + 1}</div>
                    <p className="pt-1 text-sm leading-7 text-text-secondary">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </CalmPanel>

          <CalmPanel title="Shortcuts" subtitle="Jump in">
            <div className="grid gap-4">
              <ActionCard title="Go to Room" description="Open the shared timeline." onClick={() => setView("room")} />
              <ActionCard title="Go to Direct" description="Open a one-to-one thread." onClick={() => setView("direct")} />
              <ActionCard title="Open Security" description="Manage invites and verification." onClick={() => setView("security")} />
            </div>
          </CalmPanel>
        </section>
      ) : null}

      {view === "room" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_300px]">
          <CalmPanel title="Room" subtitle="Shared conversation">
            <div className="grid gap-4">
              <SectionHeader
                title={room?.room.title ?? "Main Room"}
                subtitle={messageStatus}
                aside={
                  <>
                    <Chip text={`${roomMessages.length} visible`} />
                    <Chip text={`${memberCount}/5 members`} />
                  </>
                }
              />

              <div className="flex gap-2 overflow-x-auto pb-1">
                {members.length === 0 ? (
                  <EmptyPanel text="No members available." />
                ) : (
                  members.map((member) => (
                    <MemberPill key={member.id} name={member.displayName} meta={`@${member.handle}`} />
                  ))
                )}
              </div>

              <div className="sy-chat-feed min-h-[540px] rounded-[26px] p-4 md:p-6">
                <div className="mx-auto max-w-[760px] space-y-3">
                  {roomMessages.length === 0 ? (
                    <EmptyPanel text="No decrypted messages loaded." />
                  ) : (
                    roomMessages.map((message, index) => (
                      <MessageItem
                        key={message.envelopeId}
                        sender={message.senderDeviceId}
                        meta={`${formatTimestamp(message.sentAt)} / ${message.expiresAt ?? "persistent"}`}
                        body={message.body}
                        active={index === 0}
                      />
                    ))
                  )}
                </div>
              </div>

              <form className="grid gap-3" onSubmit={handleSendMessage}>
                <div className="mx-auto w-full max-w-[760px]">
                  <ComposerDock title="Send message">
                    <textarea
                      className="sy-input min-h-28 resize-y"
                      placeholder="Write to the room"
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <ActionButton pending={isPending} label="Send message" pendingLabel="Sealing..." />
                    </div>
                  </ComposerDock>
                </div>
              </form>
            </div>
          </CalmPanel>

          <div className="grid content-start gap-4">
            <CalmPanel title="Room Access" subtitle="Unlock">
              <form className="grid gap-3" onSubmit={handleRoomUnlock}>
                <Field label="Shared room secret">
                  <input
                    className="sy-input"
                    type="password"
                    value={roomSecret}
                    onChange={(event) => setRoomSecret(event.target.value)}
                  />
                </Field>
                <ActionButton pending={isPending} label="Unlock room" pendingLabel="Decrypting..." />
              </form>
            </CalmPanel>

            <CalmPanel title="Status" subtitle="Room">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatusCard title="Feed" value={`${cipherEnvelopes.length} sealed envelopes`} />
                <StatusCard title="You" value={currentMember?.displayName ?? "Pending device"} />
                <StatusCard title="Expiry" value={draftComposer.disappearingWindow === "off" ? "Off" : draftComposer.disappearingWindow} />
              </div>
            </CalmPanel>
          </div>
        </section>
      ) : null}

      {view === "direct" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_300px]">
          <CalmPanel title="Direct" subtitle="Private thread">
            <div className="grid gap-4">
              <SectionHeader
                title={selectedDirectName}
                subtitle={dmState.status}
                aside={<Chip text={`${dmState.messages.length} visible`} />}
              />

              <div className="sy-chat-feed min-h-[540px] rounded-[26px] p-4 md:p-6">
                <div className="mx-auto max-w-[760px] space-y-3">
                  {dmState.messages.length === 0 ? (
                    <EmptyPanel text="No decrypted direct messages loaded." />
                  ) : (
                    dmState.messages.map((message, index) => (
                      <MessageItem
                        key={message.envelopeId}
                        sender={message.senderDeviceId}
                        meta={`${formatTimestamp(message.sentAt)} / direct`}
                        body={message.body}
                        active={index === 0}
                      />
                    ))
                  )}
                </div>
              </div>

              <form className="grid gap-3" onSubmit={handleSendDirectMessage}>
                <div className="mx-auto w-full max-w-[760px]">
                  <ComposerDock title="Send direct message">
                    <textarea
                      className="sy-input min-h-28 resize-y"
                      placeholder="Write to this member"
                      value={dmState.body}
                      onChange={(event) =>
                        setDmState((current) => ({
                          ...current,
                          body: event.target.value
                        }))
                      }
                    />
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <ActionButton pending={isPending} label="Send direct" pendingLabel="Sealing..." />
                    </div>
                  </ComposerDock>
                </div>
              </form>
            </div>
          </CalmPanel>

          <div className="grid content-start gap-4">
            <CalmPanel title="Thread Setup" subtitle="Member and secret">
              <div className="grid gap-4">
                <Field label="Recipient">
                  <select
                    className="sy-input"
                    value={dmState.recipientId}
                    onChange={(event) =>
                      setDmState((current) => ({
                        ...current,
                        recipientId: event.target.value
                      }))
                    }
                  >
                    <option value="">Select member</option>
                    {members
                      .filter((member) => member.id !== "member_iris")
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Thread secret">
                  <input
                    className="sy-input"
                    type="password"
                    value={dmState.secret}
                    onChange={(event) =>
                      setDmState((current) => ({
                        ...current,
                        secret: event.target.value
                      }))
                    }
                  />
                </Field>
                <form className="grid gap-3" onSubmit={handleDirectUnlock}>
                  <ActionButton pending={isPending} label="Unlock thread" pendingLabel="Decrypting..." />
                </form>
              </div>
            </CalmPanel>

            <CalmPanel title="People" subtitle="Available members">
              <div className="grid gap-3">
                {members.length === 0 ? (
                  <EmptyPanel text="No members available." />
                ) : (
                  members.map((member) => (
                    <MemberPill key={member.id} name={member.displayName} meta={`@${member.handle}`} />
                  ))
                )}
              </div>
            </CalmPanel>

            <ResultBlock title="Thread status" body={dmState.status} meta={`${dmState.envelopes.length} sealed items`} />
          </div>
        </section>
      ) : null}

      {view === "identity" ? (
        <section className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <CalmPanel title="Members" subtitle="Identity modules">
            <div className="grid gap-4 md:grid-cols-2">
              {(room?.members ?? []).map((member) => (
                <div key={member.id} className="sy-info-card rounded-[24px] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium uppercase tracking-[0.12em] text-text-primary">{member.displayName}</p>
                      <p className="font-mono text-xs text-text-secondary">@{member.handle}</p>
                    </div>
                    <SecurityStatusBadge label={member.badge} tone="active" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip text={member.layout} />
                    <Chip text={member.accent} />
                  </div>
                </div>
              ))}
            </div>
          </CalmPanel>
          <CalmPanel title="Theme Presets" subtitle="Controlled customization">
            <div className="grid gap-3 md:grid-cols-2">
              {UI_THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`sy-theme-card rounded-[22px] px-4 py-4 text-left transition ${
                    activeTheme === preset.id ? "sy-theme-card-active" : ""
                  }`}
                  onClick={() => {
                    setActiveTheme(preset.id);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="sy-theme-card-copy">
                      <p className="sy-theme-card-title">{preset.label}</p>
                      <p className="sy-theme-card-body">{preset.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="sy-theme-swatch" style={{ background: preset.primary, boxShadow: `0 0 16px ${preset.primary}` }} />
                      <span className="sy-theme-swatch" style={{ background: preset.secondary, boxShadow: `0 0 16px ${preset.secondary}` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CalmPanel>
        </section>
      ) : null}

      {view === "security" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <CalmPanel title="Access" subtitle="Invites and verification">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <form className="grid gap-3" onSubmit={handleCreateInviteSubmit}>
                  <Field label="Invite label">
                    <input
                      className="sy-input"
                      value={inviteForm.label}
                      onChange={(event) => setInviteForm((current) => ({ ...current, label: event.target.value }))}
                    />
                  </Field>
                  <Field label="Created by">
                    <input
                      className="sy-input"
                      value={inviteForm.createdByMemberId}
                      onChange={(event) =>
                        setInviteForm((current) => ({ ...current, createdByMemberId: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Expiry">
                    <input
                      className="sy-input"
                      type="datetime-local"
                      value={inviteForm.expiresAt}
                      onChange={(event) => setInviteForm((current) => ({ ...current, expiresAt: event.target.value }))}
                    />
                  </Field>
                  <ActionButton pending={isPending} label="Create invite" pendingLabel="Issuing..." />
                </form>
                {createdInvite ? (
                  <ResultBlock title={createdInvite.label} body={createdInvite.code} meta={`Expires ${formatTimestamp(createdInvite.expiresAt)}`} />
                ) : null}
              </div>

              <div className="grid gap-6">
                <form className="grid gap-3" onSubmit={handleRedeemSubmit}>
                  <Field label="Invite code">
                    <input
                      className="sy-input sy-code-text"
                      value={redeemForm.code}
                      onChange={(event) => setRedeemForm((current) => ({ ...current, code: event.target.value }))}
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Display">
                      <input
                        className="sy-input"
                        value={redeemForm.displayName}
                        onChange={(event) =>
                          setRedeemForm((current) => ({ ...current, displayName: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Handle">
                      <input
                        className="sy-input"
                        value={redeemForm.handle}
                        onChange={(event) => setRedeemForm((current) => ({ ...current, handle: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Device">
                      <input
                        className="sy-input"
                        value={redeemForm.deviceLabel}
                        onChange={(event) =>
                          setRedeemForm((current) => ({ ...current, deviceLabel: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Method">
                      <select
                        className="sy-input"
                        value={redeemForm.verificationMethod}
                        onChange={(event) =>
                          setRedeemForm((current) => ({
                            ...current,
                            verificationMethod: event.target.value as RedeemInviteForm["verificationMethod"]
                          }))
                        }
                      >
                        <option value="qr">QR</option>
                        <option value="code">Secure code</option>
                      </select>
                    </Field>
                  </div>
                  <ActionButton pending={isPending} label="Redeem invite" pendingLabel="Joining..." />
                </form>

                <form className="grid gap-3" onSubmit={handleVerifySubmit}>
                  <Field label="Device id">
                    <input
                      className="sy-input sy-code-text"
                      value={verifyForm.deviceId}
                      onChange={(event) => setVerifyForm((current) => ({ ...current, deviceId: event.target.value }))}
                    />
                  </Field>
                  <Field label="Verification proof">
                    <input
                      className="sy-input"
                      value={verifyForm.proof}
                      onChange={(event) => setVerifyForm((current) => ({ ...current, proof: event.target.value }))}
                    />
                  </Field>
                  <ActionButton pending={isPending} label="Verify device" pendingLabel="Signing..." />
                </form>
              </div>
            </div>
          </CalmPanel>

          <CalmPanel title="Local Vault" subtitle="Draft protection">
            <form className="grid gap-3" onSubmit={handleVaultUnlock}>
              <Field label="Unlock phrase">
                <input
                  className="sy-input"
                  type="password"
                  value={vaultPassphrase}
                  onChange={(event) => setVaultPassphrase(event.target.value)}
                />
              </Field>
              <ActionButton pending={isPending} label="Unlock vault" pendingLabel="Unlocking..." />
            </form>

            <form className="mt-4 grid gap-3" onSubmit={handleDraftSave}>
              <Field label="Draft">
                <textarea
                  className="sy-input min-h-28 resize-y"
                  value={draftComposer.body}
                  onChange={(event) => setDraftComposer((current) => ({ ...current, body: event.target.value }))}
                />
              </Field>
              <Field label="Disappear timer">
                <select
                  className="sy-input"
                  value={draftComposer.disappearingWindow}
                  onChange={(event) =>
                    setDraftComposer((current) => ({
                      ...current,
                      disappearingWindow: event.target.value as DraftRecord["disappearingWindow"]
                    }))
                  }
                >
                  <option value="off">Off</option>
                  <option value="8h">8 Hours</option>
                  <option value="24h">24 Hours</option>
                </select>
              </Field>
              <ActionButton pending={isPending} label="Save draft" pendingLabel="Encrypting..." />
            </form>

            <div className="mt-4 grid gap-2">
              {vaultState.drafts.length === 0 ? (
                <EmptyPanel text="No encrypted drafts stored." />
              ) : (
                vaultState.drafts.map((draft) => (
                  <button
                    key={draft.id}
                    className="sy-button-soft sy-card-button rounded-[18px]"
                    type="button"
                    onClick={() =>
                      setDraftComposer({
                        body: draft.body,
                        disappearingWindow: draft.disappearingWindow
                      })
                    }
                  >
                    <p className="sy-card-button-title">{draft.disappearingWindow}</p>
                    <p className="sy-card-button-body">{draft.body.slice(0, 96) || "Empty draft"}</p>
                  </button>
                ))
              )}
            </div>
          </CalmPanel>
        </section>
      ) : null}

      {errorMessage ? (
        <motion.div
          className="sy-panel rounded-[20px] border-alert/20 bg-alert/8 p-4 text-sm text-alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {errorMessage}
        </motion.div>
      ) : null}

      <footer className="sy-footer">
        <span>SY-PH3R</span>
        <span>Quiet minds. Trusted circle.</span>
        <span>Copyright 2026 SY-PH3R</span>
      </footer>
    </AppShell>
  );
}

function LoadingScreen() {
  const streams = [
    "01010011 01011001 00101101 01010000 01001000 00110011 01010010",
    "10100101 01010110 00110101 01001010 10101001 00110010 01100100",
    "00010101 01010100 11100010 01010101 00110010 01000111 00110011",
    "01010111 00110011 01001001 10101010 00111100 01010101 01010001",
    "00110110 01001110 11110000 01010111 00101010 01011101 00110000",
    "01001010 11100011 01010110 00110001 01010011 00111101 01010100"
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/78 backdrop-blur-[3px]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-[min(760px,calc(100vw-40px))] overflow-hidden rounded-[28px] border border-border bg-background/78 px-6 py-8 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
          {streams.map((stream, index) => (
            <motion.div
              key={stream}
              className="absolute top-[-24%] font-mono text-[11px] leading-5 tracking-[0.16em] text-accent-primary/42"
              style={{ left: `${10 + index * 14}%`, whiteSpace: "pre" }}
              animate={{ y: ["0%", "160%"], opacity: [0, 0.52, 0.16, 0] }}
              transition={{
                duration: 8 + (index % 3),
                delay: index * 0.28,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear"
              }}
            >
              {Array.from({ length: 14 }, () => stream).join("\n")}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="relative z-10 mx-auto max-w-[420px] text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <p className="sy-terminal-label">SY-PH3R / initializing</p>
          <h2 className="mt-4 text-4xl font-semibold uppercase tracking-[0.14em] text-text-primary md:text-5xl">
            Loading...
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            01010011 01011001 00101101 01010000 01001000 00110011 01010010
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CommandPanel({
  title,
  badge,
  children
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      className="sy-panel rounded-[26px] p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="sy-terminal-label">{badge}</p>
          <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em] text-text-primary">{title}</h2>
        </div>
      </div>
      <div className="sy-divider mb-4" />
      {children}
    </motion.section>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="sy-terminal-label">{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  pending,
  label,
  pendingLabel
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <CyberButton label={label} pending={pending} pendingLabel={pendingLabel} type="submit" />
  );
}

function getDefaultExpiry() {
  const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "pending";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toMessage(error: unknown) {
  if (error instanceof TypeError) {
    return "Relay offline. Start the local relay to sync.";
  }

  return error instanceof Error ? error.message : "Unexpected error";
}

function getDirectRoomId(recipientId: string) {
  return `dm_${recipientId}`;
}

function resolveMemberName(members: MemberProfile[], recipientId: string) {
  return members.find((member) => member.id === recipientId)?.displayName ?? recipientId;
}

export default App;

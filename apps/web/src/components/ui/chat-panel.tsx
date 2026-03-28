import { motion } from "motion/react";
import { MessageItem } from "./message-item";

const sampleMessages = [
  {
    sender: "Iris",
    meta: "room_main // 21:14",
    body: "Signal is clean. Keep this channel low-noise and direct.",
    active: true
  },
  {
    sender: "Sage",
    meta: "room_main // 21:17",
    body: "Verification completed. Device trust anchored and room key loaded."
  },
  {
    sender: "Noor",
    meta: "room_main // 21:22",
    body: "Draft stayed local until send. Relay only received the sealed envelope."
  }
];

export function ChatPanel() {
  return (
    <motion.section
      className="sy-panel sy-panel-glow relative rounded-[28px] p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.06, ease: "easeOut" }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="sy-terminal-label">Room Feed</p>
          <h3 className="mt-2 text-2xl font-semibold uppercase tracking-[0.14em]">Room_Main</h3>
        </div>
        <div className="rounded-full border border-accent-secondary/20 bg-accent-secondary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-secondary">
          encrypted envelopes
        </div>
      </div>

      <div className="sy-divider mb-4" />

      <div className="grid gap-3">
        {sampleMessages.map((message) => (
          <MessageItem key={message.meta} {...message} />
        ))}
      </div>

      <div className="mt-4 rounded-[22px] border border-border bg-background/70 p-4">
        <p className="sy-terminal-label">Compose</p>
        <div className="mt-3 rounded-[18px] border border-border bg-panel-2 px-4 py-3 text-sm text-text-secondary">
          Drafts remain local until transmission. Ambient shell stays active, reading surface stays calm.
        </div>
      </div>
    </motion.section>
  );
}


import { motion } from "motion/react";
import { SecurityStatusBadge } from "./security-status-badge";

export function ProfileCard() {
  return (
    <motion.article
      className="sy-panel sy-panel-glow relative flex h-full flex-col gap-5 rounded-[26px] p-5"
      whileHover={{ y: -4, boxShadow: "0 0 34px rgba(124,255,107,0.09)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="sy-terminal-label">Identity Module</p>
          <h3 className="mt-2 text-xl font-semibold uppercase tracking-[0.16em]">Iris</h3>
          <p className="sy-code-text mt-1 text-sm">@observer / signal-core</p>
        </div>
        <SecurityStatusBadge label="verified" tone="secure" />
      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-border bg-panel-2 p-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/80 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-[20px] border border-accent-primary/20 bg-accent-primary/10 font-mono text-2xl text-accent-primary shadow-[0_0_30px_rgba(124,255,107,0.12)]">
            IR
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <SecurityStatusBadge label="room-main" tone="active" />
              <SecurityStatusBadge label="ghost-terminal" tone="secure" />
            </div>
            <p className="max-w-xs text-sm leading-6 text-text-secondary">
              Coded presence, quiet profile, constrained theme presets.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["Frame", "Gridline"],
          ["Media", "Images only"],
          ["Devices", "02 active"],
          ["State", "low-noise"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-border bg-background/70 p-3">
            <p className="sy-terminal-label">{label}</p>
            <p className="mt-2 text-sm text-text-secondary">{value}</p>
          </div>
        ))}
      </div>
    </motion.article>
  );
}


import { motion } from "motion/react";
import { SecurityStatusBadge } from "./security-status-badge";

export function InviteVerificationCard() {
  return (
    <motion.section
      className="sy-panel relative rounded-[24px] p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="sy-terminal-label">Access Path</p>
          <h3 className="mt-2 text-lg font-semibold uppercase tracking-[0.12em]">Invite / Verify</h3>
        </div>
        <SecurityStatusBadge label="awaiting handoff" tone="active" />
      </div>

      <div className="mt-4 grid gap-3">
        {[
          ["Invite Code", "INVITE_3D7A91F2"],
          ["Verification", "QR / secure phrase"],
          ["Session", "device-bound token"],
          ["State", "operator confirmed"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-[18px] border border-border bg-background/70 p-3">
            <p className="sy-terminal-label">{label}</p>
            <p className="mt-2 font-mono text-sm text-text-secondary">{value}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

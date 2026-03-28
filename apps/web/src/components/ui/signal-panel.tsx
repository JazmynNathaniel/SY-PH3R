import { motion } from "motion/react";
import { cn } from "../../lib/cn";

export function SignalPanel({
  title,
  subtitle,
  children,
  className,
  quiet = false
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  quiet?: boolean;
}) {
  return (
    <motion.section
      className={cn(
        quiet ? "sy-signal-panel sy-panel-quiet" : "sy-signal-panel",
        "rounded-[26px] p-5",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="mb-4">
        {subtitle ? <p className="sy-terminal-label text-accent-secondary">{subtitle}</p> : null}
        <h2 className="sy-section-heading mt-2">{title}</h2>
      </div>
      <div className="sy-divider mb-4 opacity-50" />
      {children}
    </motion.section>
  );
}

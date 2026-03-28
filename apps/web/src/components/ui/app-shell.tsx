import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { BinaryBackdrop } from "./binary-backdrop";

export function AppShell({
  children,
  className,
  theme = "emerald-static"
}: {
  children: ReactNode;
  className?: string;
  theme?: string;
}) {
  return (
    <div
      className={cn("relative min-h-screen overflow-hidden bg-background text-text-primary", className)}
      data-theme={theme}
    >
      <BinaryBackdrop />
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-col gap-7 px-6 py-6 md:px-10 lg:px-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

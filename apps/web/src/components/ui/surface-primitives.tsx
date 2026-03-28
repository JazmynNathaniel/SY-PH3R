import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { SignalPanel } from "./signal-panel";

export function ResultBlock({
  title,
  body,
  meta
}: {
  title: string;
  body: string;
  meta: string;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-border bg-background/70 p-4">
      <p className="sy-terminal-label">{title}</p>
      <p className="mt-2 break-all text-sm text-text-primary">{body}</p>
      <p className="mt-2 text-sm text-text-secondary">{meta}</p>
    </div>
  );
}

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background/60 px-4 py-5 text-sm text-text-secondary">
      {text}
    </div>
  );
}

export function Chip({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-accent-secondary/20 bg-accent-secondary/8 px-3 py-1 sy-meta text-accent-secondary">
      {text}
    </span>
  );
}

export function StatPanel({
  label,
  value,
  meta
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="sy-panel rounded-[22px] p-4">
      <p className="sy-terminal-label">{label}</p>
      <p className="sy-emphasis-value mt-3">{value}</p>
      <p className="mt-2 text-sm text-text-secondary">{meta}</p>
    </div>
  );
}

export function ViewTabs<T extends string>({
  view,
  onChange,
  items
}: {
  view: T;
  onChange: (view: T) => void;
  items: Array<{ id: T; label: string }>;
}) {
  return (
    <nav className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const active = item.id === view;
        return (
          <button
            key={item.id}
            className={cn(
              "sy-button-soft sy-nav-tab rounded-full",
              active ? "sy-button-soft-active" : "sy-button-soft-muted"
            )}
            onClick={() => onChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background/50 px-4 py-4">
      <p className="sy-terminal-label">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">{value}</p>
    </div>
  );
}

export function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background/40 px-4 py-3">
      <p className="sy-terminal-label">{label}</p>
      <p className="sy-emphasis-value mt-2 text-accent-primary">{value}</p>
    </div>
  );
}

export function ActionCard({
  title,
  description,
  onClick
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="sy-button-soft sy-card-button min-h-[104px]"
      onClick={onClick}
      type="button"
    >
      <p className="sy-card-button-title">{title}</p>
      <p className="sy-card-button-body">{description}</p>
    </button>
  );
}

export function ThreadHeader({
  title,
  subtitle,
  meta
}: {
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <div className="mb-5 rounded-[20px] border border-border bg-background/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="sy-section-heading text-text-primary">{title}</p>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>
        <span className="sy-meta text-accent-secondary">{meta}</span>
      </div>
    </div>
  );
}

export function SoftInfo({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background/35 px-4 py-4 text-sm leading-6 text-text-secondary">
      {text}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  aside
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="sy-section-heading">{title}</h2>
        {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
    </div>
  );
}

export function MemberPill({
  name,
  meta
}: {
  name: string;
  meta: string;
}) {
  return (
    <div className="sy-member-pill rounded-full px-3 py-2">
      <p className="sy-section-heading text-text-primary">{name}</p>
      <p className="sy-meta">{meta}</p>
    </div>
  );
}

export function ComposerDock({
  title,
  children,
  footer
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="sy-composer-bar rounded-[24px] p-4">
      <p className="sy-section-heading mb-3 text-text-primary">{title}</p>
      <div className="grid gap-3">{children}</div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

export function CalmPanel({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <SignalPanel quiet subtitle={subtitle} title={title}>
      {children}
    </SignalPanel>
  );
}

export function TerminalStrip({
  title,
  items,
  accent = "primary"
}: {
  title: string;
  items: string[];
  accent?: "primary" | "secondary";
}) {
  return (
    <motion.div className="sy-panel rounded-[24px] p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between gap-4">
        <p className="sy-terminal-label">{title}</p>
        <div
          className={`h-2 w-2 rounded-full ${
            accent === "secondary"
              ? "bg-accent-secondary shadow-[0_0_10px_rgba(61,255,179,0.9)]"
              : "bg-accent-primary shadow-[0_0_10px_rgba(124,255,107,0.9)]"
          }`}
        />
      </div>
      <div className="sy-divider my-4" />
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-[16px] border border-border bg-background/60 px-4 py-3 text-sm text-text-secondary"
          >
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

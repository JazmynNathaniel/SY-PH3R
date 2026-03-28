import { cn } from "../../lib/cn";

export function MessageCard({
  sender,
  body,
  meta,
  active = false
}: {
  sender: string;
  body: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <article
      className={cn(
        "sy-message-card relative rounded-[22px] px-4 py-4 transition-colors",
        active
          ? "border-accent-primary/16 bg-[rgba(15,22,15,0.84)] shadow-[0_0_18px_rgba(124,255,107,0.04)]"
          : "border-border/90"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[14px] border border-accent-primary/12 bg-accent-primary/6 font-mono text-[12px] uppercase text-accent-primary">
            {sender.slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-text-primary">{sender}</p>
            <p className="sy-code-text text-[11px]">{meta}</p>
          </div>
        </div>
        <div className="h-2 w-2 rounded-full bg-accent-primary/65 shadow-[0_0_6px_rgba(124,255,107,0.35)]" />
      </div>
      <p className="max-w-[68ch] text-sm leading-7 text-[#edf8ed]">{body}</p>
    </article>
  );
}

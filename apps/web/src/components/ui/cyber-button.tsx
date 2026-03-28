import { cn } from "../../lib/cn";

export function CyberButton({
  label,
  pendingLabel,
  pending = false,
  className,
  type = "button",
  onClick
}: {
  label: string;
  pendingLabel?: string;
  pending?: boolean;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      className={cn("sy-button relative z-[1]", className)}
      disabled={pending}
      onClick={onClick}
      type={type}
    >
      {pending ? pendingLabel ?? label : label}
    </button>
  );
}

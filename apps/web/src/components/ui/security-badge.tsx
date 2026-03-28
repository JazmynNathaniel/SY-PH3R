import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva("sy-badge", {
  variants: {
    tone: {
      secure: "border-accent-primary/30 bg-accent-primary/8 text-accent-primary",
      active: "border-accent-secondary/30 bg-accent-secondary/8 text-accent-secondary",
      alert: "border-alert/30 bg-alert/10 text-alert"
    }
  },
  defaultVariants: {
    tone: "secure"
  }
});

export type SecurityBadgeProps = VariantProps<typeof badgeVariants> & {
  label: string;
  className?: string;
};

export function SecurityBadge({ label, tone, className }: SecurityBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
      {label}
    </span>
  );
}


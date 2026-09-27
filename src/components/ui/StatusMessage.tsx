import type { HTMLAttributes, ReactNode } from "react";

type StatusTone = "info" | "success" | "warning" | "danger";

export type StatusMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  tone?: StatusTone;
};

export function StatusMessage({ children, className, role = "status", tone = "info", ...props }: StatusMessageProps) {
  const classes = ["ff-status", `ff-status--${tone}`, className].filter(Boolean).join(" ");
  return <p {...props} aria-live="polite" className={classes} role={role}>{children}</p>;
}

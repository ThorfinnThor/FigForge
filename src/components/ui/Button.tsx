import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  children,
  className,
  disabled = false,
  loading = false,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [
    "ff-button",
    `ff-button--${variant}`,
    `ff-button--${size}`,
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      className={classes}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading || undefined}
    >
      {loading ? "Lädt …" : children}
    </button>
  );
}

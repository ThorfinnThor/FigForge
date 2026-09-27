import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function Card({ children, className, selected = false, ...props }: CardProps) {
  const classes = ["ff-card", selected ? "ff-card--selected" : null, className].filter(Boolean).join(" ");
  return <div {...props} className={classes} data-selected={selected ? "true" : undefined}>{children}</div>;
}

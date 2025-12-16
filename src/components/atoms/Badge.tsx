import { type ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary-light text-foreground dark:bg-secondary-dark dark:text-foreground-dark",
  primary: "bg-primary-light text-foreground dark:bg-primary-dark dark:text-foreground-dark",
  secondary: "bg-secondary-light text-foreground dark:bg-secondary-dark dark:text-foreground-dark",
  success: "bg-success-light text-success-dark dark:bg-success-dark dark:text-foreground-dark",
  warning: "bg-warning-light text-foreground dark:bg-warning-dark dark:text-foreground-dark",
  danger: "bg-danger-light text-danger-dark dark:bg-danger-dark dark:text-foreground-dark",
  info: "bg-info-light text-info-dark dark:bg-info-dark dark:text-foreground-dark",
};

/**
 * Badge - Atom component for displaying status labels
 */
export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-block text-sm px-2 py-1 rounded font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

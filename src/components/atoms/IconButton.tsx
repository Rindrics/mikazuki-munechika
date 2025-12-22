"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

type IconButtonVariant = "default" | "danger" | "primary";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: "text-secondary hover:text-primary hover:bg-secondary-light/50",
  danger: "text-secondary hover:text-danger hover:bg-danger-light/50",
  primary: "text-secondary hover:text-primary hover:bg-primary/10",
};

/**
 * IconButton - Atom component for icon-only buttons
 */
export function IconButton({
  variant = "default",
  children,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`p-2 rounded transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

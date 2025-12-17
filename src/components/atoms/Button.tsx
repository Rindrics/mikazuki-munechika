import { type ReactNode, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-disabled disabled:cursor-not-allowed",
  secondary:
    "bg-secondary-light text-foreground hover:bg-secondary dark:bg-secondary-dark dark:text-foreground-dark dark:hover:bg-secondary disabled:bg-disabled disabled:cursor-not-allowed",
  danger:
    "bg-danger text-white hover:bg-danger-hover disabled:bg-disabled disabled:cursor-not-allowed",
  success:
    "bg-success text-white hover:bg-success-hover disabled:bg-disabled disabled:cursor-not-allowed",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

/**
 * Button - Atom component for actions
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={disabled || isLoading}
      className={`rounded-lg font-medium transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? "処理中..." : children}
    </button>
  );
}

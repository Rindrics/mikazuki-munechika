"use client";

import { type ReactNode } from "react";

interface ButtonGroupProps {
  children: ReactNode;
  /** Arrange buttons horizontally or vertically */
  direction?: "horizontal" | "vertical";
  /** Gap between buttons */
  gap?: "sm" | "md" | "lg";
  /** Make all buttons equal width (useful for horizontal layout) */
  equalWidth?: boolean;
  className?: string;
}

const gapStyles = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

/**
 * ButtonGroup - Molecule component for grouping buttons
 *
 * Provides consistent spacing and optional equal-width layout for buttons
 */
export function ButtonGroup({
  children,
  direction = "horizontal",
  gap = "md",
  equalWidth = false,
  className = "",
}: ButtonGroupProps) {
  const directionClass = direction === "horizontal" ? "flex-row" : "flex-col";
  const equalWidthClass = equalWidth ? "[&>*]:flex-1" : "";

  return (
    <div
      className={`flex ${directionClass} ${gapStyles[gap]} ${equalWidthClass} ${className}`}
    >
      {children}
    </div>
  );
}

import { type ReactNode } from "react";
import { StatusBadge } from "../molecules";
import type { 評価ステータス } from "@/domain/models/stock/status";

interface StatusPanelProps {
  status: 評価ステータス;
  children?: ReactNode;
  className?: string;
}

/**
 * StatusPanel - Organism component for displaying assessment status and actions
 */
export function StatusPanel({ status, children, className = "" }: StatusPanelProps) {
  return (
    <section
      className={`p-4 border rounded-lg bg-secondary-light dark:bg-secondary-dark ${className}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-secondary whitespace-nowrap">
          評価ステータス:
        </span>
        <StatusBadge status={status} />
        {children && <div className="ml-auto">{children}</div>}
      </div>
    </section>
  );
}

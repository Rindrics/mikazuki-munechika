import { StatusBadge } from "../molecules";
import type { 評価ステータス } from "@/domain/models/stock/status";

interface StatusPanelProps {
  status: 評価ステータス;
  stockName: string;
  className?: string;
}

/**
 * StatusPanel - Organism component for displaying assessment status information
 */
export function StatusPanel({ status, stockName, className = "" }: StatusPanelProps) {
  return (
    <section className={`p-4 border rounded-lg bg-secondary-light dark:bg-secondary-dark ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-secondary mb-1">評価ステータス</h3>
          <p className="text-xs text-secondary">{stockName}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

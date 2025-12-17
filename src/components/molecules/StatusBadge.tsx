import { Badge, type BadgeVariant } from "../atoms";
import type { 評価ステータス } from "@/domain/models/stock/status";

interface StatusBadgeProps {
  status: 評価ステータス;
  className?: string;
}

/**
 * Map assessment status to badge variant
 */
const statusVariantMap: Record<評価ステータス, BadgeVariant> = {
  未着手: "secondary",
  作業中: "primary",
  内部査読中: "warning",
  外部公開可能: "info",
  外部査読中: "info",
  再検討中: "danger",
  外部査読受理済み: "success",
};

/**
 * StatusBadge - Molecule component for displaying assessment status
 */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const variant = statusVariantMap[status];

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

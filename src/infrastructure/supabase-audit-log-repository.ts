import type { 資源名 } from "@/domain/models";
import type { 評価ステータス } from "@/domain/models/stock/status";
import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase-server-client";
import { logger } from "@/utils/logger";

export interface StatusChangeAuditLog {
  userId: string;
  stockGroupName: 資源名;
  fiscalYear: number;
  beforeStatus: 評価ステータス | null;
  afterStatus: 評価ステータス;
  reason: string;
}

/**
 * Repository for audit logging.
 * Uses service_role client per ADR 0004 - audit inserts must be restricted to service_role.
 */
export class SupabaseAuditLogRepository {
  private supabase = getSupabaseServiceRoleClient();

  /**
   * Log a status change event
   */
  async logStatusChange(log: StatusChangeAuditLog): Promise<void> {
    logger.debug("logStatusChange called", { log });

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await this.supabase
      .from("stock_groups")
      .select("id")
      .eq("name", log.stockGroupName)
      .single();

    if (stockGroupError || !stockGroup) {
      logger.error("Stock group not found for audit log", { stockGroupName: log.stockGroupName });
      // Don't throw - audit logging should not fail the main operation
      return;
    }

    const { error } = await this.supabase.from("audit_logs").insert({
      user_id: log.userId,
      action_type: "STATUS_CHANGE",
      resource_type: "stock_assessment",
      stock_group_id: stockGroup.id,
      before_data: log.beforeStatus ? { status: log.beforeStatus } : null,
      after_data: { status: log.afterStatus },
      metadata: {
        fiscal_year: log.fiscalYear,
        reason: log.reason,
      },
    });

    if (error) {
      logger.error("Failed to insert audit log", { log }, error as Error);
      // Don't throw - audit logging should not fail the main operation
      return;
    }

    logger.info("Status change audit log created", {
      stockGroupName: log.stockGroupName,
      beforeStatus: log.beforeStatus,
      afterStatus: log.afterStatus,
      reason: log.reason,
    });
  }
}

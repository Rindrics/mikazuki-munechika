"use server";

import { ABC算定, SaveAssessmentResultService } from "@/application";
import {
  ABC算定結果,
  漁獲量データ,
  生物学的データ,
  資源名,
  create資源情報,
  create資源評価,
} from "@/domain";
import {
  type 評価ステータス,
  type 進行中資源評価,
  type 再検討中資源評価,
  require保存可能ステータス,
} from "@/domain/models/stock/status";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";
import { create資源評価RepositoryServer } from "@/infrastructure/assessment-repository-server-factory";
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
import { SupabaseAuditLogRepository } from "@/infrastructure/supabase-audit-log-repository";
import { logger } from "@/utils/logger";

// Get current fiscal year (April-based fiscal year in Japan)
function getCurrentFiscalYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-indexed
  const year = now.getFullYear();
  // Fiscal year starts in April
  return month >= 4 ? year : year - 1;
}

export async function calculateAbcAction(
  stockGroupName: 資源名,
  catchDataValue: string,
  biologicalDataValue: string
): Promise<ABC算定結果> {
  const stockGroup = create資源情報(stockGroupName);
  const stock = create資源評価(stockGroup);

  const catchData: 漁獲量データ = { value: catchDataValue };
  const biologicalData: 生物学的データ = { value: biologicalDataValue };

  return ABC算定(stock, catchData, biologicalData);
}

export async function saveAssessmentResultAction(
  stockGroupName: 資源名,
  result: ABC算定結果
): Promise<void> {
  // Check current status - only "作業中" or "再検討中" can save results
  const statusRepository = await create資源評価RepositoryServer();
  const 年度 = getCurrentFiscalYear();
  const currentAssessment = await statusRepository.findBy資源名And年度(stockGroupName, 年度);
  const currentStatus = currentAssessment?.ステータス ?? "未着手";

  // This will throw if status doesn't allow saving
  require保存可能ステータス(currentStatus);

  const stockGroup = create資源情報(stockGroupName);
  const stock = create資源評価(stockGroup);

  const repository = createAssessmentResultRepository();
  const service = new SaveAssessmentResultService(repository);

  // Type assertion is safe here because require保存可能ステータス already validated
  await service.execute(stock as unknown as 進行中資源評価 | 再検討中資源評価, result);
}

/**
 * Get current assessment status for a stock
 */
export async function getAssessmentStatusAction(stockGroupName: 資源名): Promise<評価ステータス> {
  const repository = await create資源評価RepositoryServer();
  const 年度 = getCurrentFiscalYear();

  const assessment = await repository.findBy資源名And年度(stockGroupName, 年度);

  // If no assessment exists, initialize it as "未着手"
  if (!assessment) {
    await repository.save({
      資源名: stockGroupName,
      年度,
      ステータス: "未着手",
    });
    return "未着手";
  }

  return assessment.ステータス;
}

/**
 * Start work on an assessment (primary assignee only)
 * Changes status from "未着手" to "作業中"
 */
export async function startWorkAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス }> {
  // Get current user from Supabase session
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);

  // Only update if status is "未着手"
  if (currentAssessment && currentAssessment.ステータス !== "未着手") {
    // Already started, just return the current status
    return { success: true, newStatus: currentAssessment.ステータス };
  }

  const beforeStatus = currentAssessment?.ステータス ?? null;

  // Update status to "作業中"
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "作業中",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "作業中",
    reason: "作業開始",
  });

  logger.info("作業開始", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "作業中" };
}

/**
 * Request internal review for an assessment
 * Changes status from "作業中" to "内部査読中"
 */
export async function requestInternalReviewAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス }> {
  // Get current user from Supabase session
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "作業中") {
    throw new Error(`現在のステータスが「作業中」ではありません: ${currentAssessment.ステータス}`);
  }

  const beforeStatus = currentAssessment?.ステータス ?? "作業中";

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "内部査読中",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "内部査読中",
    reason: "内部査読依頼",
  });

  logger.info("内部査読依頼完了", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "内部査読中" };
}

/**
 * Cancel internal review request
 * Changes status from "内部査読中" to "作業中"
 */
export async function cancelInternalReviewAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス }> {
  // Get current user from Supabase session
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "内部査読中") {
    throw new Error(
      `現在のステータスが「内部査読中」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment?.ステータス ?? "内部査読中";

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "作業中",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "作業中",
    reason: "内部査読依頼取り消し",
  });

  logger.info("内部査読依頼取り消し完了", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "作業中" };
}

/**
 * Approve internal review (secondary assignee)
 * Changes status from "内部査読中" to "外部公開可能"
 */
export async function approveInternalReviewAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス }> {
  // Get current user from Supabase session
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "内部査読中") {
    throw new Error(
      `現在のステータスが「内部査読中」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment?.ステータス ?? "内部査読中";

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "外部公開可能",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "外部公開可能",
    reason: "内部査読承諾",
  });

  logger.info("内部査読承諾完了", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "外部公開可能" };
}

/**
 * Publish assessment externally (administrator only)
 * Changes status from "外部公開可能" to "外部査読中"
 */
export async function publishExternallyAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス }> {
  // Get current user from Supabase session
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "外部公開可能") {
    throw new Error(
      `現在のステータスが「外部公開可能」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment?.ステータス ?? "外部公開可能";

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "外部査読中",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "外部査読中",
    reason: "外部公開",
  });

  logger.info("外部公開完了", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "外部査読中" };
}

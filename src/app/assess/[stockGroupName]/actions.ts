"use server";

import { ABC算定, SaveAssessmentResultService } from "@/application";
import {
  ABC算定結果,
  漁獲量データ,
  生物学的データ,
  資源名,
  create資源情報,
  create資源評価,
  ロール,
  ロールs,
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
import { SupabaseClient } from "@supabase/supabase-js";

// Get current fiscal year (April-based fiscal year in Japan)
function getCurrentFiscalYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-indexed
  const year = now.getFullYear();
  // Fiscal year starts in April
  return month >= 4 ? year : year - 1;
}

/**
 * Verify user has the required role for a specific stock group
 * @throws Error if user doesn't have the required role
 */
async function verifyUserRole(
  supabase: SupabaseClient,
  userId: string,
  stockGroupName: 資源名,
  requiredRole: ロール
): Promise<void> {
  // Get stock group ID from name
  const { data: stockGroup, error: stockGroupError } = await supabase
    .from("stock_groups")
    .select("id")
    .eq("name", stockGroupName)
    .single();

  if (stockGroupError || !stockGroup) {
    throw new Error(`資源グループが見つかりません: ${stockGroupName}`);
  }

  // Check user's role for this stock group
  const { data: roleData, error: roleError } = await supabase
    .from("user_stock_group_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("stock_group_id", stockGroup.id)
    .single();

  if (roleError || !roleData) {
    throw new Error("この資源に対する権限がありません");
  }

  if (roleData.role !== requiredRole) {
    const roleDisplayNames: Record<ロール, string> = {
      [ロールs.主担当]: "主担当者",
      [ロールs.副担当]: "副担当者",
      [ロールs.管理者]: "管理者",
    };
    throw new Error(`${roleDisplayNames[requiredRole]}のみがこの操作を実行できます`);
  }
}

/**
 * Verify user is an administrator (has admin role for any stock group)
 * @throws Error if user is not an administrator
 */
async function verifyAdministrator(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: roleData, error: roleError } = await supabase
    .from("user_stock_group_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", ロールs.管理者)
    .limit(1);

  if (roleError || !roleData || roleData.length === 0) {
    throw new Error("管理者のみがこの操作を実行できます");
  }
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

  // Verify user is primary assignee for this stock
  await verifyUserRole(supabase, user.id, stockGroupName, ロールs.主担当);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
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
 * Request internal review for an assessment (primary assignee only)
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

  // Verify user is primary assignee for this stock
  await verifyUserRole(supabase, user.id, stockGroupName, ロールs.主担当);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  if (currentAssessment.ステータス !== "作業中") {
    throw new Error(`現在のステータスが「作業中」ではありません: ${currentAssessment.ステータス}`);
  }

  const beforeStatus = currentAssessment.ステータス;

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
 * Cancel internal review request (primary assignee only)
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

  // Verify user is primary assignee for this stock
  await verifyUserRole(supabase, user.id, stockGroupName, ロールs.主担当);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  if (currentAssessment.ステータス !== "内部査読中") {
    throw new Error(
      `現在のステータスが「内部査読中」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment.ステータス;

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
 * Approve internal review (secondary assignee only)
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

  // Verify user is secondary assignee for this stock
  await verifyUserRole(supabase, user.id, stockGroupName, ロールs.副担当);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  if (currentAssessment.ステータス !== "内部査読中") {
    throw new Error(
      `現在のステータスが「内部査読中」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment.ステータス;

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

  // Verify user is an administrator
  await verifyAdministrator(supabase, user.id);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  if (currentAssessment.ステータス !== "外部公開可能") {
    throw new Error(
      `現在のステータスが「外部公開可能」ではありません: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment.ステータス;

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

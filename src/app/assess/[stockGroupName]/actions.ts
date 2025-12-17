"use server";

import { ABC算定 } from "@/application";
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
import { type 評価ステータス, require保存可能ステータス } from "@/domain/models/stock/status";
import type { VersionedAssessmentResult } from "@/domain/repositories";
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

/**
 * Get stock group ID from stock group name
 */
async function getStockGroupId(supabase: SupabaseClient, stockGroupName: 資源名): Promise<string> {
  const { data: stockGroup, error } = await supabase
    .from("stock_groups")
    .select("id")
    .eq("name", stockGroupName)
    .single();

  if (error || !stockGroup) {
    throw new Error(`資源グループが見つかりません: ${stockGroupName}`);
  }

  return stockGroup.id;
}

export async function saveAssessmentResultAction(
  stockGroupName: 資源名,
  result: ABC算定結果,
  catchDataValue: string,
  biologicalDataValue: string
): Promise<{ version: number; isNew: boolean }> {
  // Check current status - only "作業中" or "再検討中" can save results
  const statusRepository = await create資源評価RepositoryServer();
  const 年度 = getCurrentFiscalYear();
  const currentAssessment = await statusRepository.findBy資源名And年度(stockGroupName, 年度);
  const currentStatus = currentAssessment?.ステータス ?? "未着手";

  // This will throw if status doesn't allow saving
  require保存可能ステータス(currentStatus);

  const repository = createAssessmentResultRepository();

  // Build parameters for reproducibility (ADR 0018)
  const parameters = {
    catchData: { value: catchDataValue },
    biologicalData: { value: biologicalDataValue },
  };

  // Save with versioning - automatically increments version number
  // If same parameters exist, returns existing version (no new record)
  const { version, isNew } = await repository.saveWithVersion(
    stockGroupName,
    年度,
    result,
    parameters
  );

  if (isNew) {
    logger.info("評価結果を新規保存しました", { stockGroupName, 年度, version });
  } else {
    logger.info("同一パラメータの既存バージョンを返しました", { stockGroupName, 年度, version });
  }

  return { version, isNew };
}

/**
 * Get version history for a stock group
 */
export async function getVersionHistoryAction(
  stockGroupName: 資源名
): Promise<VersionedAssessmentResult[]> {
  const 年度 = getCurrentFiscalYear();
  const repository = createAssessmentResultRepository();

  const versions = await repository.findByStockNameAndFiscalYear(stockGroupName, 年度);

  return versions;
}

/**
 * Get a specific version of assessment result
 */
export async function getAssessmentResultByVersionAction(
  stockGroupName: 資源名,
  version: number
): Promise<VersionedAssessmentResult | undefined> {
  const 年度 = getCurrentFiscalYear();
  const repository = createAssessmentResultRepository();

  return repository.findByStockNameAndVersion(stockGroupName, 年度, version);
}

/**
 * Get current assessment status for a stock
 */
export async function getAssessmentStatusAction(
  stockGroupName: 資源名
): Promise<{ status: 評価ステータス; approvedVersion?: number }> {
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
    return { status: "未着手" };
  }

  return { status: assessment.ステータス, approvedVersion: assessment.承諾バージョン };
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
  stockGroupName: 資源名,
  targetVersion: number
): Promise<{ success: boolean; newStatus: 評価ステータス; requestedVersion: number }> {
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
  const resultRepository = createAssessmentResultRepository();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Verify the target version exists
  const targetResult = await resultRepository.findByStockNameAndVersion(
    stockGroupName,
    年度,
    targetVersion
  );
  if (!targetResult) {
    throw new Error(`バージョン v${targetVersion} が見つかりません`);
  }

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  // Allow from "作業中" or "再検討中"
  if (currentAssessment.ステータス !== "作業中" && currentAssessment.ステータス !== "再検討中") {
    throw new Error(
      `内部査読依頼は「作業中」または「再検討中」ステータスでのみ実行できます。現在のステータス: ${currentAssessment.ステータス}`
    );
  }

  const beforeStatus = currentAssessment.ステータス;

  // Update status with target version (version under review)
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "内部査読中",
    承諾バージョン: targetVersion, // Record which version is under review
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "内部査読中",
    reason: `内部査読依頼 (v${targetVersion})`,
  });

  logger.info("内部査読依頼完了", { stockGroupName, userId: user.id, targetVersion });

  return { success: true, newStatus: "内部査読中", requestedVersion: targetVersion };
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
 * Records the approved version number
 */
export async function approveInternalReviewAction(
  stockGroupName: 資源名,
  approvedVersion?: number
): Promise<{ success: boolean; newStatus: 評価ステータス; approvedVersion: number }> {
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

  // Use the version that was requested for review (stored in 承諾バージョン during requestInternalReviewAction)
  // If explicitly specified, use that; otherwise use the requested version
  let versionToApprove = approvedVersion;
  if (!versionToApprove) {
    // Get the version that was requested for review
    versionToApprove = currentAssessment.承諾バージョン;
    if (!versionToApprove) {
      throw new Error("査読対象バージョンが指定されていません。内部査読を依頼し直してください。");
    }
  }

  const beforeStatus = currentAssessment.ステータス;

  // Update status with approved version
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "外部公開可能",
    承諾バージョン: versionToApprove,
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "外部公開可能",
    reason: `内部査読承諾 (v${versionToApprove})`,
  });

  logger.info("内部査読承諾完了", {
    stockGroupName,
    userId: user.id,
    approvedVersion: versionToApprove,
  });

  return { success: true, newStatus: "外部公開可能", approvedVersion: versionToApprove };
}

/**
 * Cancel internal review approval (secondary assignee or administrator)
 * Changes status from "外部公開可能" to "内部査読中"
 */
export async function cancelApprovalAction(
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

  // Check if user is administrator
  const { data: adminRoleData } = await supabase
    .from("user_stock_group_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", ロールs.管理者)
    .limit(1);

  const isAdmin = adminRoleData && adminRoleData.length > 0;

  // Check if user is secondary assignee for this stock
  let isSecondary = false;
  if (!isAdmin) {
    const stockGroupId = await getStockGroupId(supabase, stockGroupName);
    const { data: roleData } = await supabase
      .from("user_stock_group_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("stock_group_id", stockGroupId)
      .single();

    isSecondary = roleData?.role === ロールs.副担当;
  }

  if (!isAdmin && !isSecondary) {
    throw new Error("承諾取り消しは副担当者または管理者のみが実行できます");
  }

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

  // Update status (clear approved version as approval is cancelled)
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "内部査読中",
    承諾バージョン: undefined,
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "内部査読中",
    reason: "承諾取り消し",
  });

  logger.info("承諾取り消し完了", {
    stockGroupName,
    userId: user.id,
  });

  return { success: true, newStatus: "内部査読中" };
}

/**
 * Request reconsideration for an assessment (secondary assignee or administrator)
 * Changes status from "内部査読中" to "再検討中"
 * Note: From "外部査読中", only administrator can request reconsideration
 */
export async function requestReconsiderationAction(
  stockGroupName: 資源名,
  targetVersion: number
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
  const resultRepository = createAssessmentResultRepository();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }

  const currentStatus = currentAssessment.ステータス;

  // Verify status is "内部査読中" or "外部査読中"
  if (currentStatus !== "内部査読中" && currentStatus !== "外部査読中") {
    throw new Error(
      `再検討依頼は「内部査読中」または「外部査読中」ステータスでのみ実行できます。現在のステータス: ${currentStatus}`
    );
  }

  // Check if user is administrator
  const { data: adminRoleData } = await supabase
    .from("user_stock_group_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", ロールs.管理者)
    .limit(1);

  const isAdmin = adminRoleData && adminRoleData.length > 0;

  // For "外部査読中", only administrator can request reconsideration
  if (currentStatus === "外部査読中" && !isAdmin) {
    throw new Error("外部査読中の再検討依頼は管理者のみが実行できます");
  }

  // For "内部査読中", check if user is secondary assignee or administrator
  if (currentStatus === "内部査読中" && !isAdmin) {
    const stockGroupId = await getStockGroupId(supabase, stockGroupName);
    const { data: roleData } = await supabase
      .from("user_stock_group_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("stock_group_id", stockGroupId)
      .eq("role", ロールs.副担当)
      .limit(1);

    const isSecondary = roleData && roleData.length > 0;
    if (!isSecondary) {
      throw new Error("内部査読中の再検討依頼は副担当者または管理者のみが実行できます");
    }
  }

  // Verify the target version exists
  const targetResult = await resultRepository.findByStockNameAndVersion(
    stockGroupName,
    年度,
    targetVersion
  );
  if (!targetResult) {
    throw new Error(`バージョン v${targetVersion} が見つかりません`);
  }

  const beforeStatus = currentStatus;

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "再検討中",
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "再検討中",
    reason: `再検討依頼 (v${targetVersion})`,
  });

  logger.info("再検討依頼完了", {
    stockGroupName,
    userId: user.id,
    targetVersion,
  });

  return { success: true, newStatus: "再検討中" };
}

/**
 * Publish assessment externally (administrator only)
 * Changes status from "外部公開可能" to "外部査読中"
 * Records the publication in assessment_publications table
 */
export async function publishExternallyAction(
  stockGroupName: 資源名
): Promise<{ success: boolean; newStatus: 評価ステータス; revisionNumber: number }> {
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
  if (!currentAssessment.承諾バージョン) {
    throw new Error("承諾済みバージョンがありません。査読承諾してから公開してください。");
  }

  const beforeStatus = currentAssessment.ステータス;
  const stockGroupId = await getStockGroupId(supabase, stockGroupName);

  // Get next revision number for this publication
  // Note: Race conditions are unlikely because:
  // 1. Single primary assignee per stock
  // 2. Status check guards against concurrent operations (see ADR 0018)
  const { data: lastPublication, error: pubError } = await supabase
    .from("assessment_publications")
    .select("revision_number")
    .eq("stock_group_id", stockGroupId)
    .eq("fiscal_year", 年度)
    .order("revision_number", { ascending: false })
    .limit(1)
    .single();

  // revision_number starts at 1 (initial publication) and increments for revisions
  const revisionNumber = pubError || !lastPublication ? 1 : lastPublication.revision_number + 1;

  // Record the publication
  const { error: insertError } = await supabase.from("assessment_publications").insert({
    stock_group_id: stockGroupId,
    fiscal_year: 年度,
    internal_version: currentAssessment.承諾バージョン,
    revision_number: revisionNumber,
    published_at: new Date().toISOString(),
  });

  if (insertError) {
    logger.error("公開履歴の記録に失敗しました", { stockGroupName, 年度 }, insertError);
    throw new Error("公開履歴の記録に失敗しました");
  }

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "外部査読中",
    承諾バージョン: currentAssessment.承諾バージョン,
  });

  // Log status change to audit log
  await auditLogRepository.logStatusChange({
    userId: user.id,
    stockGroupName,
    fiscalYear: 年度,
    beforeStatus,
    afterStatus: "外部査読中",
    reason: `外部公開 (内部v${currentAssessment.承諾バージョン} → 改訂${revisionNumber})`,
  });

  logger.info("外部公開完了", {
    stockGroupName,
    userId: user.id,
    internalVersion: currentAssessment.承諾バージョン,
    revisionNumber,
  });

  return { success: true, newStatus: "外部査読中", revisionNumber };
}

/**
 * Stop external publication (administrator only)
 * Changes status from "外部査読中" to "外部公開可能"
 */
export async function stopExternalPublicationAction(
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

  // Verify user is administrator
  await verifyAdministrator(supabase, user.id);

  const repository = await create資源評価RepositoryServer();
  const auditLogRepository = new SupabaseAuditLogRepository();
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (!currentAssessment) {
    throw new Error(`評価が見つかりません: ${stockGroupName} (${年度}年度)`);
  }
  if (currentAssessment.ステータス !== "外部査読中") {
    throw new Error(
      `現在のステータスが「外部査読中」ではありません: ${currentAssessment.ステータス}`
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
    reason: "外部公開停止",
  });

  logger.info("外部公開停止完了", {
    stockGroupName,
    userId: user.id,
  });

  return { success: true, newStatus: "外部公開可能" };
}

/**
 * Get publication history for a stock group
 */
export async function getPublicationHistoryAction(stockGroupName: 資源名): Promise<
  Array<{
    revisionNumber: number;
    internalVersion: number;
    publishedAt: Date;
  }>
> {
  const supabase = await getSupabaseServerClient();
  const 年度 = getCurrentFiscalYear();
  const stockGroupId = await getStockGroupId(supabase, stockGroupName);

  const { data, error } = await supabase
    .from("assessment_publications")
    .select("revision_number, internal_version, published_at")
    .eq("stock_group_id", stockGroupId)
    .eq("fiscal_year", 年度)
    .order("revision_number", { ascending: false });

  if (error) {
    logger.error("公開履歴の取得に失敗しました", { stockGroupName, 年度 }, error);
    throw new Error("公開履歴の取得に失敗しました");
  }

  return (data || []).map((pub) => ({
    revisionNumber: pub.revision_number,
    internalVersion: pub.internal_version,
    publishedAt: new Date(pub.published_at),
  }));
}

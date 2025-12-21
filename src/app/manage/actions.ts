"use server";

import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
import { SupabaseAuditLogRepository } from "@/infrastructure/supabase-audit-log-repository";
import { Supabaseユーザー管理Repository } from "@/infrastructure/supabase-user-management-repository";
import type { ユーザー情報 } from "@/domain/repositories";
import type { 資源名, ロール } from "@/domain";
import { logger } from "@/utils/logger";

const CURRENT_FISCAL_YEAR_KEY = "current_fiscal_year";

/**
 * Check if current user is an administrator
 */
async function requireAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  // Check if user has admin role (may have multiple admin roles for different stocks)
  const { data: adminRoles, error } = await supabase
    .from("user_stock_group_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "管理者")
    .limit(1);

  if (error || !adminRoles || adminRoles.length === 0) {
    throw new Error("管理者権限が必要です");
  }

  return user;
}

export interface FiscalYearInfo {
  year: number;
  assessmentCount: number;
  allNotStarted: boolean;
}

/**
 * Get current fiscal year from system settings
 */
export async function getCurrentFiscalYearAction(): Promise<number | null> {
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", CURRENT_FISCAL_YEAR_KEY)
    .single();

  if (!data) {
    return null;
  }

  return data.value as number;
}

/**
 * Get list of all fiscal years with assessment data
 */
export async function getFiscalYearsAction(): Promise<FiscalYearInfo[]> {
  const supabase = await getSupabaseServerClient();
  await requireAdmin(supabase);

  // Get distinct fiscal years from stock_assessments
  const { data: assessments, error } = await supabase
    .from("stock_assessments")
    .select("fiscal_year, status")
    .order("fiscal_year", { ascending: true });

  if (error) {
    logger.error("Failed to fetch fiscal years", {}, error as Error);
    throw new Error("年度一覧の取得に失敗しました");
  }

  // Group by fiscal year
  const yearMap = new Map<number, { count: number; allNotStarted: boolean }>();

  for (const a of assessments || []) {
    const existing = yearMap.get(a.fiscal_year);
    if (existing) {
      existing.count++;
      if (a.status !== "未着手") {
        existing.allNotStarted = false;
      }
    } else {
      yearMap.set(a.fiscal_year, {
        count: 1,
        allNotStarted: a.status === "未着手",
      });
    }
  }

  return Array.from(yearMap.entries()).map(([year, info]) => ({
    year,
    assessmentCount: info.count,
    allNotStarted: info.allNotStarted,
  }));
}

/**
 * Set current fiscal year
 */
export async function setCurrentFiscalYearAction(year: number): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const user = await requireAdmin(supabase);

  // Check if the year exists in assessments
  const { data: assessments } = await supabase
    .from("stock_assessments")
    .select("id")
    .eq("fiscal_year", year)
    .limit(1);

  if (!assessments || assessments.length === 0) {
    throw new Error(`${year}年度の資源評価が存在しません`);
  }

  // Upsert current fiscal year setting
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: CURRENT_FISCAL_YEAR_KEY,
      value: year,
      description: "現在の資源評価年度",
      updated_by: user.id,
    },
    { onConflict: "key" }
  );

  if (error) {
    logger.error("Failed to set current fiscal year", { year }, error as Error);
    throw new Error("年度の切り替えに失敗しました");
  }

  logger.info("Current fiscal year changed", { year, userId: user.id });
}

/**
 * Create assessments for a new fiscal year
 */
export async function createFiscalYearAction(year: number): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const user = await requireAdmin(supabase);

  // Check if year already exists
  const { data: existing } = await supabase
    .from("stock_assessments")
    .select("id")
    .eq("fiscal_year", year)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error(`${year}年度は既に存在します`);
  }

  // Get all stock groups
  const { data: stockGroups, error: stockGroupsError } = await supabase
    .from("stock_groups")
    .select("id, name");

  if (stockGroupsError || !stockGroups) {
    throw new Error("資源グループの取得に失敗しました");
  }

  // Create assessments for each stock group
  const assessments = stockGroups.map((sg) => ({
    stock_group_id: sg.id,
    fiscal_year: year,
    status: "未着手",
    origin_status: null,
    updated_by: user.id,
  }));

  const { error: insertError } = await supabase.from("stock_assessments").insert(assessments);

  if (insertError) {
    logger.error("Failed to create fiscal year", { year }, insertError as Error);
    throw new Error("年度の作成に失敗しました");
  }

  // Log audit for each stock group
  const auditLogRepository = new SupabaseAuditLogRepository();
  for (const sg of stockGroups) {
    await auditLogRepository.logStatusChange({
      userId: user.id,
      stockGroupName: sg.name,
      fiscalYear: year,
      beforeStatus: null,
      afterStatus: "未着手",
      reason: "新年度初期化",
    });
  }

  logger.info("Fiscal year created", { year, count: stockGroups.length, userId: user.id });
}

/**
 * Delete assessments for a fiscal year (only if all are "未着手")
 */
export async function deleteFiscalYearAction(year: number): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const user = await requireAdmin(supabase);

  // Check if all assessments are "未着手"
  const { data: assessments } = await supabase
    .from("stock_assessments")
    .select("id, status")
    .eq("fiscal_year", year);

  if (!assessments || assessments.length === 0) {
    throw new Error(`${year}年度の資源評価が存在しません`);
  }

  const hasStarted = assessments.some((a) => a.status !== "未着手");
  if (hasStarted) {
    throw new Error("作業が開始されている年度は削除できません");
  }

  // Check if this is the current fiscal year
  const currentYear = await getCurrentFiscalYearAction();
  if (currentYear === year) {
    throw new Error("現在の年度は削除できません。先に別の年度に切り替えてください");
  }

  // Delete all assessments for this year
  const { error } = await supabase.from("stock_assessments").delete().eq("fiscal_year", year);

  if (error) {
    logger.error("Failed to delete fiscal year", { year }, error as Error);
    throw new Error("年度の削除に失敗しました");
  }

  logger.info("Fiscal year deleted", { year, userId: user.id });
}

// =============================================================================
// User Management Actions
// =============================================================================

/**
 * Get all users with their profiles and stock assignments
 */
export async function getUsersAction(): Promise<ユーザー情報[]> {
  const supabase = await getSupabaseServerClient();
  await requireAdmin(supabase);

  const repository = new Supabaseユーザー管理Repository();
  return repository.findAll();
}

/**
 * Get all stock groups for assignment selection
 */
export async function getStockGroupsAction(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await getSupabaseServerClient();
  await requireAdmin(supabase);

  const { data, error } = await supabase.from("stock_groups").select("id, name").order("name");

  if (error) {
    logger.error("Failed to fetch stock groups", {}, error as Error);
    throw new Error("資源グループの取得に失敗しました");
  }

  return data || [];
}

/**
 * Invite a new user by email
 */
export async function inviteUserAction(data: {
  name: string;
  email: string;
  stockAssignments: Array<{ stockName: 資源名; role: ロール }>;
}): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const admin = await requireAdmin(supabase);

  const repository = new Supabaseユーザー管理Repository();
  await repository.invite(
    {
      氏名: data.name,
      メールアドレス: data.email,
      担当資源: data.stockAssignments.map((a) => ({
        資源名: a.stockName,
        ロール: a.role,
      })),
    },
    admin.email
  );

  logger.info("User invited", { email: data.email, invitedBy: admin.email });
}

/**
 * Update user's stock assignments
 */
export async function updateUserAssignmentsAction(
  userId: string,
  stockAssignments: Array<{ stockName: 資源名; role: ロール }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await requireAdmin(supabase);

  const repository = new Supabaseユーザー管理Repository();
  await repository.updateAssignments(
    userId,
    stockAssignments.map((a) => ({
      資源名: a.stockName,
      ロール: a.role,
    }))
  );

  logger.info("User assignments updated", { userId });
}

/**
 * Delete a user from the system
 */
export async function deleteUserAction(userId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const admin = await requireAdmin(supabase);

  // Prevent self-deletion
  if (admin.id === userId) {
    throw new Error("自分自身は削除できません");
  }

  const repository = new Supabaseユーザー管理Repository();
  await repository.delete(userId);

  logger.info("User deleted", { userId, deletedBy: admin.id });
}

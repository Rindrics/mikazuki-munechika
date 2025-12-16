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
import type { 評価ステータス } from "@/domain/models/stock/status";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";
import { create資源評価RepositoryServer } from "@/infrastructure/assessment-repository-server-factory";
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
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
  const stockGroup = create資源情報(stockGroupName);
  const stock = create資源評価(stockGroup);

  const repository = createAssessmentResultRepository();
  const service = new SaveAssessmentResultService(repository);

  await service.execute(stock, result);
}

/**
 * Get current assessment status for a stock
 */
export async function getAssessmentStatusAction(
  stockGroupName: 資源名
): Promise<評価ステータス> {
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
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "作業中") {
    throw new Error(`現在のステータスが「作業中」ではありません: ${currentAssessment.ステータス}`);
  }

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "内部査読中",
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
  const 年度 = getCurrentFiscalYear();

  // Get current status
  const currentAssessment = await repository.findBy資源名And年度(stockGroupName, 年度);
  if (currentAssessment && currentAssessment.ステータス !== "内部査読中") {
    throw new Error(`現在のステータスが「内部査読中」ではありません: ${currentAssessment.ステータス}`);
  }

  // Update status
  await repository.save({
    資源名: stockGroupName,
    年度,
    ステータス: "作業中",
  });

  logger.info("内部査読依頼取り消し完了", { stockGroupName, userId: user.id });

  return { success: true, newStatus: "作業中" };
}

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
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";

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

  // TODO: Get current assessment status from repository
  // TODO: Persist status change to database
  // For now, just return the new status
  console.log(`[Action] 内部査読依頼: ${stockGroupName} by ${user.email}`);

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

  // TODO: Get current assessment status from repository
  // TODO: Persist status change to database
  // For now, just return the new status
  console.log(`[Action] 内部査読依頼取り消し: ${stockGroupName} by ${user.email}`);

  return { success: true, newStatus: "作業中" };
}

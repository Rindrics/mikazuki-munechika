"use server";

import { createExcelParser } from "@/infrastructure/excel-parser/parser";
import { createReviewRepository } from "@/infrastructure/supabase-review-repository";
import { create査読用資源評価 } from "@/domain/models/review";
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
import { create資源情報, create資源評価 } from "@/domain/helpers";
import { ABC算定 } from "@/application/calculate-abc";
import type { 公開データセット } from "@/domain/models/published-data/types";
import type { 当年までの資源計算結果 } from "@/domain/models/stock/calculation/strategy";
import type { 資源名 } from "@/domain/models/stock/stock/model";
import type { ABC算定結果, 漁獲量データ, 生物学的データ } from "@/domain/data";

/**
 * Serializable summary of parsed data for client display
 * Note: 年齢年行列 contains methods that cannot be serialized, so we extract only the needed data
 */
export interface ParsedDataSummary {
  資源名: 資源名;
  年度: number;
  最終年: number;
  年範囲: { 開始年: number; 終了年: number };
  年齢範囲: { 最小年齢: number; 最大年齢: number };
}

/**
 * Parse Excel file and return serializable summary for display
 */
export async function parseExcelAction(
  formData: FormData
): Promise<{ data?: ParsedDataSummary; error?: string }> {
  try {
    const file = formData.get("file") as File;

    if (!file) {
      return { error: "ファイルが選択されていません" };
    }

    const parser = createExcelParser();
    const parsed = await parser.parse(file);

    // Extract only serializable data for client display
    const summary: ParsedDataSummary = {
      資源名: parsed.資源名,
      年度: parsed.年度,
      最終年: parsed.コホート解析結果.最終年,
      年範囲: { ...parsed.コホート解析結果.年齢別漁獲尾数.年範囲 },
      年齢範囲: { ...parsed.コホート解析結果.年齢別漁獲尾数.年齢範囲 },
    };

    return { data: summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "パース中にエラーが発生しました";
    return { error: message };
  }
}

/**
 * Calculate ABC for review
 * Uses dummy calculation logic (same as assessment page)
 */
export async function calculateReviewAbcAction(
  資源名: 資源名,
  漁獲データValue: string,
  生物学的データValue: string
): Promise<ABC算定結果> {
  const stockGroup = create資源情報(資源名);
  const stock = create資源評価(stockGroup);

  const catchData: 漁獲量データ = { value: 漁獲データValue };
  const biologicalData: 生物学的データ = { value: 生物学的データValue };

  return ABC算定(stock, catchData, biologicalData);
}

/**
 * Convert コホート解析結果 to 当年までの資源計算結果
 *
 * @see ADR 0025 for branded type rationale
 */
function toResourceCalculationResult(data: 公開データセット): 当年までの資源計算結果 {
  const { コホート解析結果 } = data;

  return {
    最終年: コホート解析結果.最終年,
    年齢別資源尾数: コホート解析結果.年齢別資源尾数,
    親魚量: コホート解析結果.親魚量,
    加入量: コホート解析結果.加入量,
    __kind: "当年まで" as const,
  };
}

/**
 * Parse and save Excel file as a review in one action
 */
export async function saveReviewAction(
  formData: FormData,
  abc結果?: ABC算定結果,
  abc漁獲データ?: string,
  abc生物学的データ?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const file = formData.get("file") as File;

    if (!file) {
      return { error: "ファイルが選択されていません" };
    }

    // Get current user
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "ログインしてください" };
    }

    // Parse the file
    const parser = createExcelParser();
    const data = await parser.parse(file);

    // Convert コホート解析結果 to 当年までの資源計算結果
    const 資源計算結果 = toResourceCalculationResult(data);

    // Create review entity with optional ABC data
    const 評価 = create査読用資源評価({
      査読者ID: user.id,
      対象資源: data.資源名,
      評価年度: data.年度,
      資源計算結果,
      ABC結果: abc結果,
      ABCパラメータ:
        abc漁獲データ && abc生物学的データ
          ? {
              漁獲データ: abc漁獲データ,
              生物学的データ: abc生物学的データ,
            }
          : undefined,
    });

    // Save to repository
    const repository = createReviewRepository();
    await repository.save(評価);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存中にエラーが発生しました";
    return { error: message };
  }
}

"use server";

import { createExcelParser } from "@/infrastructure/excel-parser/parser";
import { createReviewRepository } from "@/infrastructure/supabase-review-repository";
import { create査読用資源評価 } from "@/domain/models/review";
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
import type { 公開データセット } from "@/domain/models/published-data/types";
import type { 当年までの資源計算結果 } from "@/domain/models/stock/calculation/strategy";
import type { 資源名 } from "@/domain/models/stock/stock/model";

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
  formData: FormData
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

    // Create review entity
    const 評価 = create査読用資源評価({
      査読者ID: user.id,
      対象資源: data.資源名,
      評価年度: data.年度,
      資源計算結果,
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

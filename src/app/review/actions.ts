"use server";

import { createExcelParser } from "@/infrastructure/excel-parser/parser";
import { createReviewRepository } from "@/infrastructure/supabase-review-repository";
import { create査読用資源評価 } from "@/domain/models/review";
import { getSupabaseServerClient } from "@/infrastructure/supabase-server-client";
import { createコホート解析Strategy } from "@/domain/models/stock/calculation/cohort-analysis";
import { 固定値 } from "@/domain/models/stock/calculation/strategy";
import type { 公開データセット } from "@/domain/models/published-data/types";
import type { 当年までの資源計算結果 } from "@/domain/models/stock/calculation/strategy";
import type { 資源名 } from "@/domain/models/stock/stock/model";
import { APP_VERSION } from "@/utils/version";
import { create資源評価RepositoryServer } from "@/infrastructure/assessment-repository-server-factory";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";
import type { ABC算定結果 } from "@/domain/data";
import type { VersionedAssessmentResult } from "@/domain/repositories";

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
 * Calculate ABC for review using parsed Excel data
 *
 * パースされた Excel データから直接 ABC を計算します。
 * ダミーデータではなく、実際のパースされた年齢別体重などを使用します。
 */
export async function calculateReviewAbcAction(
  formData: FormData
): Promise<{ result?: ABC算定結果; error?: string }> {
  try {
    const file = formData.get("file") as File;

    if (!file) {
      return { error: "ファイルが選択されていません" };
    }

    // Parse the file
    const parser = createExcelParser();
    const data = await parser.parse(file);

    // Convert to 当年までの資源計算結果
    const 当年結果 = toResourceCalculationResult(data);

    // Get age-specific weights from last year of parsed data
    const 体重データ = data.コホート解析結果.年齢別体重;

    if (!体重データ || !体重データ.データ || 体重データ.データ.length === 0) {
      return {
        error:
          "年齢別体重データが見つかりません。Excel ファイルに体重データが含まれていることを確認してください。",
      };
    }

    const 最終年Index = 体重データ.データ.length - 1;
    const 年齢別体重 = 体重データ.データ[最終年Index];

    if (!年齢別体重 || 年齢別体重.length === 0) {
      return {
        error: "最終年の年齢別体重データが空です。Excel ファイルのデータを確認してください。",
      };
    }

    // Create strategy and run future projection + ABC calculation
    const strategy = createコホート解析Strategy();

    // Use default parameters
    const F = { 値: 0.3 };
    const M = (_年齢: number) => 固定値(0.4);
    const 予測年数 = 1;

    // Run future projection with parsed weight data
    const 予測結果 = strategy.将来予測(当年結果, F, 予測年数, M, 年齢別体重);

    // Run ABC decision
    const 規則 = {
      目標F: 0.3,
      禁漁水準: 10000, // 10,000 トン
      限界管理基準値: 50000, // 50,000 トン
      目標管理基準値: 100000, // 100,000 トン
    };
    const β = { 値: 0.8 };

    const abc結果 = strategy.ABC決定(予測結果, 規則, β);

    return {
      result: {
        ...abc結果,
        appVersion: APP_VERSION,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "計算中にエラーが発生しました";
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
  formData: FormData,
  abc結果?: ABC算定結果
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

/**
 * Get published (approved) assessment result for comparison
 */
export async function getPublishedAssessmentAction(
  資源名: 資源名,
  年度: number
): Promise<{ result?: VersionedAssessmentResult; error?: string }> {
  try {
    // 1. Get assessment status to find approved version
    const assessmentRepo = await create資源評価RepositoryServer();
    const assessment = await assessmentRepo.findBy資源名And年度(資源名, 年度);

    if (!assessment) {
      return { error: `${資源名}（${年度}年度）の資源評価が見つかりません` };
    }

    if (!assessment.承諾バージョン) {
      return {
        error: `${資源名}（${年度}年度）は承諾済みのバージョンがありません（現在のステータス: ${assessment.ステータス}）`,
      };
    }

    // 2. Fetch the approved version from assessment_results
    const resultRepo = createAssessmentResultRepository();
    const result = await resultRepo.findByStockNameAndVersion(
      資源名,
      年度,
      assessment.承諾バージョン
    );

    if (!result) {
      return { error: "公開された評価結果が見つかりません" };
    }

    return { result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "データ取得中にエラーが発生しました";
    return { error: message };
  }
}

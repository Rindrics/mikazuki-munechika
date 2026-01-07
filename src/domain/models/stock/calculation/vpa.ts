/**
 * VPA (Virtual Population Analysis) Implementation
 *
 * 本実装は、マイワシ太平洋系群の資源評価における
 * チューニングVPA（コホート解析）に基づいています。
 *
 * 計算方法：
 * - Pope (1972) の近似式を使用
 * - 最高齢グループの計算は平松 (1999) の方法を使用
 * - 自然死亡係数 M = 0.4 を仮定
 * - 年齢構成: 0～4歳、および5歳以上をまとめた最高齢グループ（5+歳）
 *
 * 参考文献：
 * - FRA-SA2025-AC001 マイワシ太平洋系群 補足資料2
 * - Pope (1972) An investigation of the accuracy of virtual population analysis
 * - 平松一彦 (1999) VPAの入門と実際
 *
 * @module vpa
 */

import type { 年齢年行列 } from "./strategy";
import { M, create年齢年行列 } from "./strategy";
import { logger } from "@/utils/logger";

/**
 * VPA 入力データ
 */
export interface VPAInput {
  年齢別漁獲尾数: 年齢年行列<"千尾">;
  年齢別体重: 年齢年行列<"g">;
  年齢別成熟割合: 年齢年行列<"無次元">;
  M: (年齢: number) => number;
  最近年の年齢別資源尾数?: readonly number[]; // Stock numbers for the most recent year (by age)
}

/**
 * VPA 計算結果
 */
export interface VPAResult {
  年齢別資源尾数: 年齢年行列<"千尾">;
  年齢別漁獲係数: 年齢年行列<"無次元">;
  親魚量: 年齢年行列<"トン">;
  加入量: 年齢年行列<"千尾">;
}

/**
 * Pope (1972) の近似式を使って、漁獲係数Fから資源尾数を計算する
 *
 * 式(2): Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
 *
 * ここで:
 * - N: 資源尾数
 * - C: 漁獲量
 * - F: 漁獲係数
 * - M: 自然死亡係数
 *
 * @param catch_量 漁獲量（千尾）
 * @param F 漁獲係数
 * @param M 自然死亡係数
 * @returns 資源尾数（千尾）
 *
 * @see マイワシ太平洋系群 補足資料2 式(2)
 */
export function calculateAbundanceFromCatch(catch_量: number, F: number, M: number): number {
  if (F <= 0) {
    throw new Error("F must be positive");
  }
  if (catch_量 < 0) {
    throw new Error("Catch must be non-negative");
  }

  // Pope approximation: Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
  const numerator = catch_量 * Math.exp(M / 2);
  const denominator = 1 - Math.exp(-F);

  if (denominator === 0) {
    throw new Error("Denominator is zero (F is zero or too large)");
  }

  return numerator / denominator;
}

/**
 * Pope (1972) の近似式を使って、資源尾数と漁獲量からFを推定する
 *
 * 式(5): Fa,y = -ln{1 - (Ca,y / Na,y) exp(M/2)}
 *
 * @param catch_量 漁獲量（千尾）
 * @param N 資源尾数（千尾）
 * @param M 自然死亡係数
 * @returns 推定された漁獲係数 F
 *
 * @see マイワシ太平洋系群 補足資料2 式(5)
 */
export function estimateFFromCatch(catch_量: number, N: number, M: number): number {
  if (N <= 0) {
    return 0;
  }
  if (catch_量 <= 0) {
    return 0;
  }

  // Pope approximation: Fa,y = -ln{1 - (Ca,y / Na,y) exp(M/2)}
  const ratio = catch_量 / N;
  const term = ratio * Math.exp(M / 2);

  // term が 1 以上の場合、漁獲量が資源尾数を超えているため、
  // ln の中身が負またはゼロになるのを防ぐ
  if (term >= 1.0) {
    // 非常に高いFを返す（ただし現実的な範囲内）
    return 10.0;
  }

  const F = -Math.log(1 - term);

  return Math.max(0, F);
}

/**
 * 後ろ向き計算で年齢別資源尾数を推定する（Pope近似）
 *
 * 最新年の最高齢から開始し、過去・若齢に向かって計算する
 *
 * 基本式:
 * - 式(1): Na,y = Na+1,y+1 exp(M) + Ca,y exp(M/2)
 * - 式(2): Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
 * - 式(3): Np,y = (Cp,y / (Cp,y + Cp-1,y)) * (Np,y+1 exp(M) + Cp,y exp(M/2))
 * - 式(4): Np-1,y = (Cp-1,y / (Cp,y + Cp-1,y)) * (Np,y+1 exp(M) + Cp-1,y exp(M/2))
 * - 式(5): Fa,y = -ln{1 - (Ca,y / Na,y) exp(M/2)}
 * - 式(6): Fp,y = Fp-1,y
 *
 * ここで、Na,yは資源尾数、Ca,yは漁獲尾数、Fa,yは漁獲係数、
 * Mは自然死亡係数、pは最高齢グループを表す
 *
 * @param input VPA入力データ
 * @returns VPA計算結果
 *
 * @see マイワシ太平洋系群 補足資料2 式(1)～(6)
 */
export function runVPA(input: VPAInput): VPAResult {
  logger.info("VPA calculation started");

  const { 年齢別漁獲尾数, 年齢別体重, 年齢別成熟割合, M, 最近年の年齢別資源尾数 } = input;

  const 年範囲 = 年齢別漁獲尾数.年範囲;
  const 年齢範囲 = 年齢別漁獲尾数.年齢範囲;
  const 年数 = 年範囲.終了年 - 年範囲.開始年 + 1;
  const 年齢数 = 年齢範囲.最大年齢 - 年齢範囲.最小年齢 + 1;

  // Validate that 最近年の年齢別資源尾数 is provided and has the correct length
  if (!最近年の年齢別資源尾数) {
    throw new Error(
      "最近年の年齢別資源尾数が必要です。VPAを実行するには最終年の全年齢の資源尾数を提供してください。"
    );
  }
  if (最近年の年齢別資源尾数.length !== 年齢数) {
    throw new Error(
      `最近年の年齢別資源尾数の長さ (${最近年の年齢別資源尾数.length}) が年齢数 (${年齢数}) と一致しません`
    );
  }

  // 結果格納用の配列（年 x 年齢）
  const 資源尾数データ: number[][] = Array(年数)
    .fill(null)
    .map(() => Array(年齢数).fill(0));

  const 漁獲係数データ: number[][] = Array(年数)
    .fill(null)
    .map(() => Array(年齢数).fill(0));

  logger.debug("VPA backward calculation", {
    年範囲,
    年齢範囲,
    最近年資源尾数サンプル: 最近年の年齢別資源尾数.slice(0, 3),
  });

  // Set 最近年の年齢別資源尾数 for the terminal year
  for (let 年齢index = 0; 年齢index < 年齢数; 年齢index++) {
    資源尾数データ[年数 - 1][年齢index] = 最近年の年齢別資源尾数[年齢index];
  }

  // 後ろ向き計算: 最新年の最高齢から開始
  for (let 年index = 年数 - 1; 年index >= 0; 年index--) {
    const is最終年 = 年index === 年数 - 1;

    for (let 年齢index = 年齢数 - 1; 年齢index >= 0; 年齢index--) {
      const 年齢 = 年齢範囲.最小年齢 + 年齢index;
      const 漁獲量 = 年齢別漁獲尾数.データ[年index][年齢index];
      const M値 = M(年齢);

      if (is最終年) {
        // 最終年: 与えられた資源尾数から F を推定
        // 式(2): Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
        const N = 資源尾数データ[年index][年齢index];
        const F = estimateFFromCatch(漁獲量, N, M値);
        漁獲係数データ[年index][年齢index] = F;

        // 最終年の最高齢グループのFも最高齢-1歳のFと等しくする（式6）
        if (年齢index === 年齢数 - 2 && 年齢数 > 1) {
          漁獲係数データ[年index][年齢数 - 1] = F;
        }
      } else if (年齢index === 年齢数 - 1) {
        // 最高齢グループ（最終年以外）
        // 式(3): Np,y = (Cp,y / (Cp,y + Cp-1,y)) * (Np,y+1 exp(M) + Cp,y exp(M/2))
        const 翌年プラスグループ = 資源尾数データ[年index + 1][年齢index];
        const 最高齢1歳漁獲量 = 年齢別漁獲尾数.データ[年index][年齢index - 1];
        const 最高齢漁獲量 = 漁獲量;

        const 漁獲量合計 = 最高齢漁獲量 + 最高齢1歳漁獲量;
        const 最高齢割合 = 漁獲量合計 > 0 ? 最高齢漁獲量 / 漁獲量合計 : 0.5;

        const 共通項 = 翌年プラスグループ * Math.exp(M値) + 最高齢漁獲量 * Math.exp(M値 / 2);
        const 推定資源尾数 = 最高齢割合 * 共通項;
        資源尾数データ[年index][年齢index] = 推定資源尾数;

        // 最高齢グループのFは後で最高齢-1歳のFと等しくする（式6）
        // ここでは仮の値を設定
        漁獲係数データ[年index][年齢index] = 0;
      } else {
        // 最終年以外かつ最高齢以外: 翌年の次年齢から後ろ向き計算（コホート追跡）
        // 式(1): Na,y = Na+1,y+1 exp(M) + Ca,y exp(M/2)
        const 翌年資源尾数 = 資源尾数データ[年index + 1][年齢index + 1];
        const 推定資源尾数 = 翌年資源尾数 * Math.exp(M値) + 漁獲量 * Math.exp(M値 / 2);
        資源尾数データ[年index][年齢index] = 推定資源尾数;

        // 式(5): Fa,y = -ln{1 - (Ca,y / Na,y) exp(M/2)}
        const F = estimateFFromCatch(漁獲量, 推定資源尾数, M値);
        漁獲係数データ[年index][年齢index] = F;

        // 最高齢-1歳の場合、最高齢グループのFも同じ値にする（式6）
        if (年齢index === 年齢数 - 2) {
          漁獲係数データ[年index][年齢数 - 1] = F;
        }
      }
    }

    // 最高齢-1歳の資源尾数を式(4)に従って再計算
    if (!is最終年) {
      const 最高齢1歳index = 年齢数 - 2;
      const 最高齢index = 年齢数 - 1;

      if (最高齢1歳index >= 0) {
        const 年齢 = 年齢範囲.最小年齢 + 最高齢1歳index;
        const M値 = M(年齢);
        const 翌年プラスグループ = 資源尾数データ[年index + 1][最高齢index];
        const 最高齢1歳漁獲量 = 年齢別漁獲尾数.データ[年index][最高齢1歳index];
        const 最高齢漁獲量 = 年齢別漁獲尾数.データ[年index][最高齢index];

        const 漁獲量合計 = 最高齢漁獲量 + 最高齢1歳漁獲量;
        const 最高齢1歳割合 = 漁獲量合計 > 0 ? 最高齢1歳漁獲量 / 漁獲量合計 : 0.5;

        // 式(4): Np-1,y = (Cp-1,y / (Cp,y + Cp-1,y)) * (Np,y+1 exp(M) + Cp-1,y exp(M/2))
        const 共通項 = 翌年プラスグループ * Math.exp(M値) + 最高齢1歳漁獲量 * Math.exp(M値 / 2);
        const 推定資源尾数 = 最高齢1歳割合 * 共通項;
        資源尾数データ[年index][最高齢1歳index] = 推定資源尾数;

        // 式(5): F を再計算
        const F = estimateFFromCatch(最高齢1歳漁獲量, 推定資源尾数, M値);
        漁獲係数データ[年index][最高齢1歳index] = F;

        // 式(6): 最高齢グループのFは最高齢-1歳のFと等しい
        漁獲係数データ[年index][最高齢index] = F;
      }
    }
  }

  logger.info("VPA calculation completed");

  // 親魚量と加入量の計算
  const 親魚量データ: number[][] = Array(年数)
    .fill(null)
    .map(() => Array(年齢数).fill(0));

  const 加入量データ: number[][] = Array(年数)
    .fill(null)
    .map(() => Array(年齢数).fill(0));

  for (let 年index = 0; 年index < 年数; 年index++) {
    for (let 年齢index = 0; 年齢index < 年齢数; 年齢index++) {
      const 資源尾数 = 資源尾数データ[年index][年齢index];
      const 体重 = 年齢別体重.データ[年index][年齢index];
      const 成熟割合 = 年齢別成熟割合.データ[年index][年齢index];

      // 親魚量 = 資源尾数 × 体重 × 成熟割合
      親魚量データ[年index][年齢index] = (資源尾数 * 体重 * 成熟割合) / 1000; // 千尾 × kg → トン

      // 加入量（年齢0のみ）
      if (年齢index === 0) {
        加入量データ[年index][年齢index] = 資源尾数;
      }
    }
  }

  // 年齢年行列を作成して返す
  return {
    年齢別資源尾数: create年齢年行列({
      単位: "千尾",
      年範囲,
      年齢範囲,
      データ: 資源尾数データ,
    }),
    年齢別漁獲係数: create年齢年行列({
      単位: "無次元",
      年範囲,
      年齢範囲,
      データ: 漁獲係数データ,
    }),
    親魚量: create年齢年行列({
      単位: "トン",
      年範囲,
      年齢範囲,
      データ: 親魚量データ,
    }),
    加入量: create年齢年行列({
      単位: "千尾",
      年範囲,
      年齢範囲,
      データ: 加入量データ,
    }),
  };
}

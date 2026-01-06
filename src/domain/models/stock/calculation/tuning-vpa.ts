/**
 * Tuning VPA (Virtual Population Analysis) Implementation
 *
 * チューニングVPA（リッジVPA）の実装
 * マイワシ太平洋系群の資源評価におけるターミナルF推定手法
 *
 * 主要な機能：
 * - 資源量指標値との適合によるターミナルF推定
 * - リッジVPAによるF推定の安定化
 * - レトロスペクティブバイアス（Mohn's ρ）の最小化
 *
 * @see FRA-SA2025-AC001 マイワシ太平洋系群 補足資料2 式(7)(8)
 * @see Okamura et al. (2017) Ridge VPA
 *
 * @module tuning-vpa
 */

import { logger } from "@/utils/logger";
import { runVPA, type VPAInput, type VPAResult } from "./vpa";
import type { 年齢年行列 } from "./strategy";

/**
 * 資源量指標値の種類
 */
export type 資源量指標種別 =
  | "北上期調査_0歳魚CPUE" // → 0歳魚資源尾数
  | "北上期調査_1歳魚CPUE" // → 1歳魚資源尾数
  | "秋季調査_0歳魚現存量" // → 0歳魚資源尾数
  | "産卵量"; // → 親魚量

/**
 * 資源量指標値データ（時系列）
 */
export interface 資源量指標値 {
  種別: 資源量指標種別;
  年範囲: { 開始年: number; 終了年: number };
  観測値: readonly number[]; // Ik,y: 指標kのy年の値
  対象年齢?: number; // 指標が対応する年齢（0歳魚、1歳魚など）
}

/**
 * VPAから計算される指標対象値
 */
export interface VPA推定値 {
  年: number;
  年齢別資源尾数: readonly number[]; // Na,y: 年齢別資源尾数
  親魚量: number; // SSB: 親魚量
}

/**
 * 比例定数qと非線形性係数b
 *
 * 式(8a): qk = exp{1/nk ∑ ln(Ik,y / Xk,y^bk)}
 * 式(8b): bk = Cov[ln(Xk), ln(Ik)] / V[ln(Xk)]
 */
export interface 指標パラメータ {
  q: number; // 比例定数（catchability coefficient）
  b: number; // 非線形性係数（0: 線形, 1: 対数線形）
}

/**
 * ターミナルF（最近年の年齢別F）
 *
 * 2023年の0～4歳のFを推定する
 */
export interface ターミナルF {
  年: number; // 最近年（2023年）
  F0: number; // 0歳魚の漁獲係数
  F1: number; // 1歳魚の漁獲係数
  F2: number; // 2歳魚の漁獲係数
  F3: number; // 3歳魚の漁獲係数
  F4: number; // 4歳魚の漁獲係数
}

/**
 * リッジVPAのペナルティ重み
 *
 * λ: 0 から 1 の間の値
 * - λ = 0: ペナルティなし（通常のチューニングVPA）
 * - λ = 1: 完全にペナルティ項のみ
 * - λ = 0.45: マイワシ太平洋系群で採用された値
 */
export type リッジペナルティ重み = number;

/**
 * リッジVPA目的関数の値
 *
 * 式(7): (1-λ)∑∑[ln(Ik,y) - ln(qk*Xk,y^bk)]²
 *        + λ∑(Fa,2023 - 1/3∑Fa,y)²
 */
export interface 目的関数値 {
  総残差平方和: number; // 第1項：指標値との残差
  ペナルティ項: number; // 第2項：Fの安定化
  合計: number; // (1-λ)*第1項 + λ*第2項
  λ: リッジペナルティ重み;
}

/**
 * チューニングVPA入力データ
 */
export interface チューニングVPA入力 {
  資源量指標値: readonly 資源量指標値[]; // 4つの指標
  直近3年F: readonly number[][]; // 2020-2022年の年齢別F（ペナルティ計算用）
  チューニング期間: { 開始年: number; 終了年: number }; // 2005-2023
  VPA入力データ: Omit<VPAInput, "最近年の年齢別資源尾数">; // VPA実行に必要な基本データ
}

/**
 * チューニングVPA結果
 */
export interface チューニングVPA結果 {
  ターミナルF: ターミナルF; // 推定された最近年のF
  指標パラメータ: ReadonlyMap<資源量指標種別, 指標パラメータ>; // 各指標のq, b
  目的関数値: 目的関数値; // 最適化後の目的関数値
  最適λ: リッジペナルティ重み; // レトロスペクティブ解析で決定されたλ
  VPA結果: VPAResult; // 最終的なVPA計算結果
}

/**
 * レトロスペクティブ解析の1回分の結果
 */
export interface レトロスペクティブ結果 {
  ピール年数: number; // 削除した年数（0は完全データ）
  終了年: number; // この解析の最終年
  親魚量: readonly number[]; // 各年の親魚量
  加入量: readonly number[]; // 各年の加入量（0歳魚資源尾数）
  年齢別F: readonly (readonly number[])[]; // 各年の年齢別F
}

/**
 * Mohn's ρ（レトロスペクティブバイアス指標）
 */
export interface MohnsRho {
  親魚量: number; // 親魚量のMohn's ρ
  加入量: number; // 加入量のMohn's ρ
  平均F: number; // 平均FのMohn's ρ
  総合: number; // 3つの平均
}

/**
 * 比例定数q を推定する
 *
 * 式(8a): qk = exp{1/nk ∑ ln(Ik,y / Xk,y^bk)}
 *
 * @param 観測値 指標値の時系列データ Ik,y
 * @param VPA推定値 VPAから計算された対象値 Xk,y
 * @param b 非線形性係数
 * @returns 比例定数 q
 */
export function estimate比例定数q(
  観測値: readonly number[],
  VPA推定値: readonly number[],
  b: number
): number {
  if (観測値.length !== VPA推定値.length) {
    throw new Error("観測値とVPA推定値の長さが一致しません");
  }

  const n = 観測値.length;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const I = 観測値[i];
    const X = VPA推定値[i];

    if (I <= 0 || X <= 0) {
      logger.warn("観測値またはVPA推定値がゼロ以下です", { i, I, X });
      continue;
    }

    // ln(Ik,y / Xk,y^bk) = ln(Ik,y) - bk * ln(Xk,y)
    sum += Math.log(I) - b * Math.log(X);
  }

  const q = Math.exp(sum / n);

  logger.debug("比例定数qを推定しました", { q, b, n });

  return q;
}

/**
 * 非線形性係数b を推定する
 *
 * 式(8b): bk = Cov[ln(Xk), ln(Ik)] / V[ln(Xk)]
 *
 * @param 観測値 指標値の時系列データ Ik,y
 * @param VPA推定値 VPAから計算された対象値 Xk,y
 * @returns 非線形性係数 b
 */
export function estimate非線形性b(
  観測値: readonly number[],
  VPA推定値: readonly number[]
): number {
  if (観測値.length !== VPA推定値.length) {
    throw new Error("観測値とVPA推定値の長さが一致しません");
  }

  const n = 観測値.length;

  // ln(X) と ln(I) の配列を作成
  const lnX: number[] = [];
  const lnI: number[] = [];

  for (let i = 0; i < n; i++) {
    const I = 観測値[i];
    const X = VPA推定値[i];

    if (I <= 0 || X <= 0) {
      logger.warn("観測値またはVPA推定値がゼロ以下です", { i, I, X });
      continue;
    }

    lnX.push(Math.log(X));
    lnI.push(Math.log(I));
  }

  if (lnX.length < 2) {
    throw new Error("有効なデータが不足しています");
  }

  // 平均を計算
  const meanLnX = lnX.reduce((sum, val) => sum + val, 0) / lnX.length;
  const meanLnI = lnI.reduce((sum, val) => sum + val, 0) / lnI.length;

  // 共分散 Cov[ln(X), ln(I)] を計算
  let cov = 0;
  for (let i = 0; i < lnX.length; i++) {
    cov += (lnX[i] - meanLnX) * (lnI[i] - meanLnI);
  }
  cov /= lnX.length;

  // 分散 V[ln(X)] を計算
  let variance = 0;
  for (let i = 0; i < lnX.length; i++) {
    variance += (lnX[i] - meanLnX) ** 2;
  }
  variance /= lnX.length;

  if (variance === 0) {
    throw new Error("VPA推定値の分散がゼロです");
  }

  const b = cov / variance;

  logger.debug("非線形性係数bを推定しました", { b, cov, variance, n: lnX.length });

  return b;
}

/**
 * 指標パラメータ（q, b）を推定する
 *
 * 式(8): q と b の同時推定
 *
 * bを先に推定し、そのbを使ってqを推定する
 *
 * @param 指標値 資源量指標値データ
 * @param VPA推定値リスト VPAから計算された対象値の時系列
 * @param 固定b b=1に固定する場合はtrueを指定（産卵量の場合）
 * @returns 指標パラメータ {q, b}
 */
export function estimate指標パラメータ(
  指標値: 資源量指標値,
  VPA推定値リスト: readonly number[],
  固定b: boolean = false
): 指標パラメータ {
  logger.info("指標パラメータ推定を開始", { 種別: 指標値.種別, 固定b });

  // b の推定（固定の場合は b = 1）
  const b = 固定b ? 1.0 : estimate非線形性b(指標値.観測値, VPA推定値リスト);

  // q の推定
  const q = estimate比例定数q(指標値.観測値, VPA推定値リスト, b);

  logger.info("指標パラメータ推定が完了", { 種別: 指標値.種別, q, b });

  return { q, b };
}

/**
 * VPA結果から資源量指標値に対応する推定値を抽出する
 *
 * @param VPA結果 基本VPAの計算結果
 * @param 指標値 抽出する指標の定義
 * @param チューニング期間 チューニングに使用する期間
 * @returns 指標に対応するVPA推定値の時系列
 */
export function extractVPA推定値(
  VPA結果: VPAResult,
  指標値: 資源量指標値,
  チューニング期間: { 開始年: number; 終了年: number }
): readonly number[] {
  const { 種別, 年範囲, 対象年齢 } = 指標値;
  const 推定値: number[] = [];

  // 年範囲をチューニング期間内に制限
  const 開始年 = Math.max(年範囲.開始年, チューニング期間.開始年);
  const 終了年 = Math.min(年範囲.終了年, チューニング期間.終了年);

  for (let 年 = 開始年; 年 <= 終了年; 年++) {
    const 年Index = 年 - VPA結果.年齢別資源尾数.年範囲.開始年;

    if (年Index < 0 || 年Index >= VPA結果.年齢別資源尾数.データ.length) {
      logger.warn("VPA結果に該当する年がありません", { 年, 種別 });
      continue;
    }

    let 値: number;

    switch (種別) {
      case "北上期調査_0歳魚CPUE":
      case "秋季調査_0歳魚現存量":
        // 0歳魚資源尾数
        値 = VPA結果.年齢別資源尾数.データ[年Index][0];
        break;

      case "北上期調査_1歳魚CPUE":
        // 1歳魚資源尾数
        値 = VPA結果.年齢別資源尾数.データ[年Index][1];
        break;

      case "産卵量":
        // 親魚量（全年齢の合計）
        値 = VPA結果.親魚量.データ[年Index].reduce((sum, val) => sum + val, 0);
        break;

      default:
        logger.warn("未知の指標種別", { 種別 });
        値 = 0;
    }

    推定値.push(値);
  }

  logger.debug("VPA推定値を抽出しました", {
    種別,
    抽出数: 推定値.length,
    サンプル: 推定値.slice(0, 3),
  });

  return 推定値;
}

/**
 * ターミナルFから最近年の年齢別資源尾数を計算する
 *
 * Pope近似（式2）を使用: Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
 *
 * @param 最終年漁獲尾数 最近年の年齢別漁獲尾数
 * @param ターミナルF 最近年の年齢別F
 * @param M 自然死亡係数
 * @returns 最近年の年齢別資源尾数
 */
export function calculateターミナル資源尾数(
  最終年漁獲尾数: readonly number[],
  ターミナルF: ターミナルF,
  M: (年齢: number) => number
): readonly number[] {
  const F配列 = [ターミナルF.F0, ターミナルF.F1, ターミナルF.F2, ターミナルF.F3, ターミナルF.F4];

  return 最終年漁獲尾数.map((catch_量, 年齢index) => {
    const M値 = M(年齢index);
    const F = F配列[年齢index] ?? F配列[F配列.length - 1]; // 5歳以上は4歳のFを使用

    // Pope approximation: Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
    const numerator = catch_量 * Math.exp(M値 / 2);
    const denominator = 1 - Math.exp(-F);

    if (denominator === 0 || denominator < 0) {
      logger.warn("denominatorがゼロまたは負です", { F, M値, 年齢index });
      return 0;
    }

    return numerator / denominator;
  });
}

/**
 * リッジVPA目的関数を計算する
 *
 * 式(7): (1-λ)∑∑[ln(Ik,y) - ln(qk*Xk,y^bk)]²
 *        + λ∑(Fa,2023 - 1/3∑Fa,y)²
 *
 * @param ターミナルF 評価する最近年のF（F0～F4）
 * @param 指標パラメータMap 各指標のq, b
 * @param 資源量指標値 観測された指標値
 * @param VPA推定値リスト VPAから計算された対象値（ターミナルFを使って計算）
 * @param 直近3年F 2020-2022年の年齢別F平均（ペナルティ計算用）
 * @param λ リッジペナルティ重み
 * @returns 目的関数値
 */
export function calculate目的関数(
  ターミナルF: ターミナルF,
  指標パラメータMap: ReadonlyMap<資源量指標種別, 指標パラメータ>,
  資源量指標値: readonly 資源量指標値[],
  VPA推定値リスト: ReadonlyMap<資源量指標種別, readonly number[]>,
  直近3年F: readonly number[],
  λ: リッジペナルティ重み
): 目的関数値 {
  logger.debug("目的関数計算開始", { ターミナルF, λ });

  // 第1項：資源量指標値との残差平方和
  let 残差平方和 = 0;

  for (const 指標値 of 資源量指標値) {
    const params = 指標パラメータMap.get(指標値.種別);
    const VPA推定値 = VPA推定値リスト.get(指標値.種別);

    if (!params || !VPA推定値) {
      logger.warn("指標パラメータまたはVPA推定値が見つかりません", {
        種別: 指標値.種別,
      });
      continue;
    }

    const { q, b } = params;

    // 各年の残差を計算
    for (let i = 0; i < 指標値.観測値.length; i++) {
      const I = 指標値.観測値[i];
      const X = VPA推定値[i];

      if (I <= 0 || X <= 0) {
        continue;
      }

      // ln(Ik,y) - ln(qk * Xk,y^bk)
      // = ln(Ik,y) - ln(qk) - bk * ln(Xk,y)
      const 残差 = Math.log(I) - Math.log(q) - b * Math.log(X);
      残差平方和 += 残差 ** 2;
    }
  }

  // 第2項：ペナルティ項（最新年Fと直近3年平均Fの差）
  const ターミナルF配列 = [
    ターミナルF.F0,
    ターミナルF.F1,
    ターミナルF.F2,
    ターミナルF.F3,
    ターミナルF.F4,
  ];

  let ペナルティ項 = 0;
  for (let 年齢 = 0; 年齢 < 5; 年齢++) {
    const F差 = ターミナルF配列[年齢] - 直近3年F[年齢];
    ペナルティ項 += F差 ** 2;
  }

  // 合計
  const 合計 = (1 - λ) * 残差平方和 + λ * ペナルティ項;

  logger.debug("目的関数計算完了", {
    残差平方和,
    ペナルティ項,
    合計,
  });

  return {
    総残差平方和: 残差平方和,
    ペナルティ項,
    合計,
    λ,
  };
}

/**
 * Nelder-Mead法による多変数最適化
 *
 * 5次元空間（F0～F4）で目的関数を最小化する
 *
 * @param 目的関数 最小化する関数 f(x): R^5 → R
 * @param 初期値 初期パラメータ [F0, F1, F2, F3, F4]
 * @param オプション 最適化オプション
 * @returns 最適化されたパラメータ
 */
export function optimizeNelderMead(
  目的関数: (x: readonly number[]) => number,
  初期値: readonly number[],
  オプション: {
    maxIterations?: number;
    tolerance?: number;
    α?: number; // reflection
    β?: number; // expansion
    γ?: number; // contraction
    δ?: number; // shrink
  } = {}
): { 最適値: readonly number[]; 目的関数値: number; 反復回数: number } {
  const {
    maxIterations = 1000,
    tolerance = 1e-6,
    α = 1.0,
    β = 2.0,
    γ = 0.5,
    δ = 0.5,
  } = オプション;

  const n = 初期値.length; // 次元数（5）

  logger.info("Nelder-Mead最適化開始", { 次元数: n, maxIterations });

  // シンプレックスを初期化（n+1個の点）
  const simplex: number[][] = [];
  simplex.push([...初期値]);

  // 初期シンプレックスを作成（各次元に沿って摂動を加える）
  for (let i = 0; i < n; i++) {
    const point = [...初期値];
    point[i] += 0.1; // 初期ステップサイズ
    simplex.push(point);
  }

  // 各点の目的関数値を計算
  const values = simplex.map((point) => 目的関数(point));

  // 最適化ループ
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // シンプレックスをソート（目的関数値の昇順）
    const indices = Array.from({ length: n + 1 }, (_, i) => i);
    indices.sort((a, b) => values[a] - values[b]);

    const best = indices[0];
    const worst = indices[n];
    const secondWorst = indices[n - 1];

    // 収束判定
    const range = values[worst] - values[best];
    if (range < tolerance) {
      logger.info("Nelder-Mead最適化収束", {
        反復回数: iteration,
        最適値: values[best],
      });
      return {
        最適値: simplex[best],
        目的関数値: values[best],
        反復回数: iteration,
      };
    }

    // 重心を計算（worst以外の点の平均）
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n + 1; i++) {
      if (i !== worst) {
        for (let j = 0; j < n; j++) {
          centroid[j] += simplex[i][j] / n;
        }
      }
    }

    // 1. Reflection
    const reflected = centroid.map((c, i) => c + α * (c - simplex[worst][i]));
    const reflectedValue = 目的関数(reflected);

    if (values[best] <= reflectedValue && reflectedValue < values[secondWorst]) {
      // Accept reflection
      simplex[worst] = reflected;
      values[worst] = reflectedValue;
      continue;
    }

    // 2. Expansion
    if (reflectedValue < values[best]) {
      const expanded = centroid.map((c, i) => c + β * (reflected[i] - c));
      const expandedValue = 目的関数(expanded);

      if (expandedValue < reflectedValue) {
        simplex[worst] = expanded;
        values[worst] = expandedValue;
      } else {
        simplex[worst] = reflected;
        values[worst] = reflectedValue;
      }
      continue;
    }

    // 3. Contraction
    const contracted = centroid.map((c, i) => c + γ * (simplex[worst][i] - c));
    const contractedValue = 目的関数(contracted);

    if (contractedValue < values[worst]) {
      simplex[worst] = contracted;
      values[worst] = contractedValue;
      continue;
    }

    // 4. Shrink
    for (let i = 0; i < n + 1; i++) {
      if (i !== best) {
        for (let j = 0; j < n; j++) {
          simplex[i][j] = simplex[best][j] + δ * (simplex[i][j] - simplex[best][j]);
        }
        values[i] = 目的関数(simplex[i]);
      }
    }
  }

  logger.warn("Nelder-Mead最適化が最大反復回数に達しました", { maxIterations });

  // 最良の点を返す
  const bestIndex = values.indexOf(Math.min(...values));
  return {
    最適値: simplex[bestIndex],
    目的関数値: values[bestIndex],
    反復回数: maxIterations,
  };
}

/**
 * レトロスペクティブ解析を実行する
 *
 * データを徐々に削減しながらVPAを複数回実行し、
 * 推定値の安定性を評価する
 *
 * @param 入力 チューニングVPA入力データ
 * @param λ リッジペナルティ重み
 * @param 最大ピール年数 削除する最大年数（通常5年）
 * @returns レトロスペクティブ解析結果の配列
 */
export function runレトロスペクティブ解析(
  入力: チューニングVPA入力,
  λ: リッジペナルティ重み,
  最大ピール年数: number = 5
): readonly レトロスペクティブ結果[] {
  logger.info("レトロスペクティブ解析開始", { λ, 最大ピール年数 });

  const 結果リスト: レトロスペクティブ結果[] = [];
  const 元の終了年 = 入力.チューニング期間.終了年;

  // ピール年数 0（完全データ）から最大ピール年数まで実行
  for (let ピール = 0; ピール <= 最大ピール年数; ピール++) {
    const 終了年 = 元の終了年 - ピール;
    const データ年数 = 入力.VPA入力データ.年齢別漁獲尾数.データ.length - ピール;

    if (データ年数 < 5) {
      // データが少なすぎる場合はスキップ
      logger.warn("データが不足しているためピールをスキップ", { ピール, データ年数 });
      break;
    }

    logger.debug("レトロスペクティブ実行", { ピール, 終了年 });

    // データを削減
    const 削減後入力: チューニングVPA入力 = {
      ...入力,
      チューニング期間: {
        ...入力.チューニング期間,
        終了年,
      },
      VPA入力データ: {
        ...入力.VPA入力データ,
        年齢別漁獲尾数: {
          ...入力.VPA入力データ.年齢別漁獲尾数,
          年範囲: {
            ...入力.VPA入力データ.年齢別漁獲尾数.年範囲,
            終了年,
          },
          データ: 入力.VPA入力データ.年齢別漁獲尾数.データ.slice(0, データ年数),
        },
        年齢別体重: {
          ...入力.VPA入力データ.年齢別体重,
          年範囲: {
            ...入力.VPA入力データ.年齢別体重.年範囲,
            終了年,
          },
          データ: 入力.VPA入力データ.年齢別体重.データ.slice(0, データ年数),
        },
        年齢別成熟割合: {
          ...入力.VPA入力データ.年齢別成熟割合,
          年範囲: {
            ...入力.VPA入力データ.年齢別成熟割合.年範囲,
            終了年,
          },
          データ: 入力.VPA入力データ.年齢別成熟割合.データ.slice(0, データ年数),
        },
      },
      資源量指標値: 入力.資源量指標値
        .map((指標) => {
          // 指標データも削減
          const 指標終了年Index = 指標.年範囲.終了年 - 指標.年範囲.開始年;
          const ピール後Index = Math.min(
            指標終了年Index,
            終了年 - 指標.年範囲.開始年
          );

          if (ピール後Index < 0) {
            return null;
          }

          return {
            ...指標,
            年範囲: {
              ...指標.年範囲,
              終了年: Math.min(指標.年範囲.終了年, 終了年),
            },
            観測値: 指標.観測値.slice(0, ピール後Index + 1),
          };
        })
        .filter((指標): 指標 is 資源量指標値 => 指標 !== null),
      直近3年F:
        ピール <= 入力.直近3年F.length
          ? 入力.直近3年F.slice(0, 入力.直近3年F.length - ピール)
          : 入力.直近3年F.slice(0, 1), // 最低1年は残す
    };

    try {
      // チューニングVPAを実行
      const チューニング結果 = runチューニングVPACore(削減後入力, λ);

      // 結果を保存
      結果リスト.push({
        ピール年数: ピール,
        終了年,
        親魚量: チューニング結果.VPA結果.親魚量.データ.map((年データ) =>
          年データ.reduce((sum, val) => sum + val, 0)
        ),
        加入量: チューニング結果.VPA結果.加入量.データ.map((年データ) => 年データ[0]),
        年齢別F: チューニング結果.VPA結果.年齢別漁獲係数.データ,
      });
    } catch (error) {
      logger.warn("レトロスペクティブ実行エラー", { ピール, error });
    }
  }

  logger.info("レトロスペクティブ解析完了", { 実行回数: 結果リスト.length });

  return 結果リスト;
}

/**
 * Mohn's ρ（レトロスペクティブバイアス）を計算する
 *
 * Mohn's ρ = 1/n ∑(X_retro - X_full) / X_full
 *
 * 値の解釈：
 * - ρ ≈ 0: バイアスなし（理想的）
 * - ρ > 0.15 or ρ < -0.15: 問題あり
 * - ρ > 0.20 or ρ < -0.20: 深刻な問題
 *
 * @param レトロ結果 レトロスペクティブ解析の結果
 * @returns Mohn's ρ
 */
export function calculateMohnsRho(
  レトロ結果: readonly レトロスペクティブ結果[]
): MohnsRho {
  if (レトロ結果.length < 2) {
    throw new Error("Mohn's ρ計算には最低2つのレトロスペクティブ結果が必要です");
  }

  // ピール=0の結果を基準（完全データ）とする
  const 完全データ = レトロ結果.find((r) => r.ピール年数 === 0);
  if (!完全データ) {
    throw new Error("完全データ（ピール=0）が見つかりません");
  }

  const ピール結果リスト = レトロ結果.filter((r) => r.ピール年数 > 0);

  let 親魚量ρ合計 = 0;
  let 加入量ρ合計 = 0;
  let 平均Fρ合計 = 0;
  let カウント = 0;

  for (const ピール結果 of ピール結果リスト) {
    // 比較する年のインデックス（ピール結果の最終年）
    const 比較年Index = ピール結果.終了年 - 完全データ.親魚量.length + 完全データ.親魚量.length;
    const 完全データIndex = ピール結果.終了年 - (完全データ.終了年 - 完全データ.親魚量.length + 1);

    if (完全データIndex < 0 || 完全データIndex >= 完全データ.親魚量.length) {
      continue;
    }

    const ピール最終年Index = ピール結果.親魚量.length - 1;

    // 親魚量の相対バイアス
    const 完全親魚量 = 完全データ.親魚量[完全データIndex];
    const ピール親魚量 = ピール結果.親魚量[ピール最終年Index];

    if (完全親魚量 > 0) {
      親魚量ρ合計 += (ピール親魚量 - 完全親魚量) / 完全親魚量;
    }

    // 加入量の相対バイアス
    const 完全加入量 = 完全データ.加入量[完全データIndex];
    const ピール加入量 = ピール結果.加入量[ピール最終年Index];

    if (完全加入量 > 0) {
      加入量ρ合計 += (ピール加入量 - 完全加入量) / 完全加入量;
    }

    // 平均Fの相対バイアス
    const 完全F = 完全データ.年齢別F[完全データIndex];
    const ピールF = ピール結果.年齢別F[ピール最終年Index];

    const 完全平均F = 完全F.reduce((sum, val) => sum + val, 0) / 完全F.length;
    const ピール平均F = ピールF.reduce((sum, val) => sum + val, 0) / ピールF.length;

    if (完全平均F > 0) {
      平均Fρ合計 += (ピール平均F - 完全平均F) / 完全平均F;
    }

    カウント++;
  }

  if (カウント === 0) {
    throw new Error("有効なレトロスペクティブ比較がありません");
  }

  const 親魚量ρ = 親魚量ρ合計 / カウント;
  const 加入量ρ = 加入量ρ合計 / カウント;
  const 平均Fρ = 平均Fρ合計 / カウント;
  const 総合ρ = (Math.abs(親魚量ρ) + Math.abs(加入量ρ) + Math.abs(平均Fρ)) / 3;

  logger.info("Mohn's ρ計算完了", {
    親魚量ρ,
    加入量ρ,
    平均Fρ,
    総合ρ,
    カウント,
  });

  return {
    親魚量: 親魚量ρ,
    加入量: 加入量ρ,
    平均F: 平均Fρ,
    総合: 総合ρ,
  };
}

/**
 * λを最適化する（Mohn's ρを最小化）
 *
 * 複数のλ候補値でレトロスペクティブ解析を実行し、
 * Mohn's ρが最小となるλを選択する
 *
 * @param 入力 チューニングVPA入力データ
 * @param λ候補値 試すλの値のリスト（省略時は [0.0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90]）
 * @param 最大ピール年数 レトロスペクティブ解析で削除する最大年数
 * @returns 最適なλとそのMohn's ρ
 */
export function optimizeLambda(
  入力: チューニングVPA入力,
  λ候補値: readonly number[] = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9],
  最大ピール年数: number = 5
): { 最適λ: number; MohnsRho: MohnsRho; 全結果: readonly { λ: number; rho: MohnsRho }[] } {
  logger.info("λ最適化開始", { λ候補値, 最大ピール年数 });

  const 結果リスト: { λ: number; rho: MohnsRho }[] = [];

  for (const λ of λ候補値) {
    logger.info("λをテスト中", { λ });

    try {
      // レトロスペクティブ解析を実行
      const レトロ結果 = runレトロスペクティブ解析(入力, λ, 最大ピール年数);

      if (レトロ結果.length < 2) {
        logger.warn("レトロスペクティブ結果が不足", { λ, 結果数: レトロ結果.length });
        continue;
      }

      // Mohn's ρを計算
      const rho = calculateMohnsRho(レトロ結果);
      結果リスト.push({ λ, rho });

      logger.info("λテスト完了", { λ, 総合ρ: rho.総合 });
    } catch (error) {
      logger.warn("λテストエラー", { λ, error });
    }
  }

  if (結果リスト.length === 0) {
    throw new Error("有効なλ候補が見つかりませんでした");
  }

  // 総合ρが最小のλを選択
  結果リスト.sort((a, b) => a.rho.総合 - b.rho.総合);
  const 最適 = 結果リスト[0];

  logger.info("λ最適化完了", {
    最適λ: 最適.λ,
    最小ρ: 最適.rho.総合,
    テスト数: 結果リスト.length,
  });

  return {
    最適λ: 最適.λ,
    MohnsRho: 最適.rho,
    全結果: 結果リスト,
  };
}

/**
 * チューニングVPAのコア実装（λ固定版）
 *
 * 内部関数として使用され、レトロスペクティブ解析からも呼ばれる
 */
function runチューニングVPACore(
  入力: チューニングVPA入力,
  λ: リッジペナルティ重み
): チューニングVPA結果 {
  const { VPA入力データ } = 入力;
  const 最終年Index = VPA入力データ.年齢別漁獲尾数.データ.length - 1;
  const 最終年漁獲尾数 = VPA入力データ.年齢別漁獲尾数.データ[最終年Index];

  // 1. 直近3年Fの平均を計算（ターミナルFの初期値）
  const 直近3年F平均 = 入力.直近3年F[0].map((_, 年齢) => {
    return 入力.直近3年F.reduce((sum, 年F) => sum + 年F[年齢], 0) / 入力.直近3年F.length;
  });

  const 初期F = [...直近3年F平均];

  // 目的関数の評価回数をカウント（デバッグ用）
  let 評価回数 = 0;

  // 2. 目的関数を定義（Nelder-Mead用）
  const 目的関数wrapper = (F配列: readonly number[]): number => {
    評価回数++;

    const ターミナルF: ターミナルF = {
      年: 入力.チューニング期間.終了年,
      F0: Math.max(0.01, F配列[0]), // Fは正の値に制限
      F1: Math.max(0.01, F配列[1]),
      F2: Math.max(0.01, F配列[2]),
      F3: Math.max(0.01, F配列[3]),
      F4: Math.max(0.01, F配列[4]),
    };

    // 2.1. ターミナルFから最近年の年齢別資源尾数を計算
    const 最近年の年齢別資源尾数 = calculateターミナル資源尾数(
      最終年漁獲尾数,
      ターミナルF,
      VPA入力データ.M
    );

    // 2.2. 基本VPAを実行
    const vpaInput: VPAInput = {
      ...VPA入力データ,
      最近年の年齢別資源尾数,
    };

    let VPA結果: VPAResult;
    try {
      VPA結果 = runVPA(vpaInput);
    } catch (error) {
      logger.warn("VPA実行エラー", { error, ターミナルF });
      return 1e10; // ペナルティとして大きな値を返す
    }

    // 2.3. VPA結果から各指標のVPA推定値を抽出
    const VPA推定値リスト = new Map<資源量指標種別, readonly number[]>();
    const 指標パラメータMap = new Map<資源量指標種別, 指標パラメータ>();

    for (const 指標値 of 入力.資源量指標値) {
      const VPA推定値 = extractVPA推定値(VPA結果, 指標値, 入力.チューニング期間);

      // 観測値とVPA推定値の長さを合わせる
      const 最小長 = Math.min(指標値.観測値.length, VPA推定値.length);
      const 観測値trim = 指標値.観測値.slice(0, 最小長);
      const VPA推定値trim = VPA推定値.slice(0, 最小長);

      VPA推定値リスト.set(指標値.種別, VPA推定値trim);

      // 2.4. 指標パラメータq, bを推定
      try {
        // 産卵量はb=1に固定、それ以外は推定
        const 固定b = 指標値.種別 === "産卵量";
        const params = estimate指標パラメータ(
          { ...指標値, 観測値: 観測値trim },
          VPA推定値trim,
          固定b
        );
        指標パラメータMap.set(指標値.種別, params);
      } catch (error) {
        logger.warn("指標パラメータ推定エラー", { error, 種別: 指標値.種別 });
        // エラーの場合はデフォルト値を使用
        指標パラメータMap.set(指標値.種別, { q: 1.0, b: 1.0 });
      }
    }

    // 2.5. 目的関数を計算
    const 目的関数値 = calculate目的関数(
      ターミナルF,
      指標パラメータMap,
      入力.資源量指標値,
      VPA推定値リスト,
      直近3年F平均,
      λ
    );

    if (評価回数 % 50 === 0) {
      logger.debug("目的関数評価中", {
        評価回数,
        目的関数値: 目的関数値.合計,
        ターミナルFサンプル: [ターミナルF.F0, ターミナルF.F1],
      });
    }

    return 目的関数値.合計;
  };

  // 3. Nelder-Mead法で最適化
  const 最適化結果 = optimizeNelderMead(目的関数wrapper, 初期F, {
    maxIterations: 500,
    tolerance: 1e-5,
  });

  // 4. 最適化されたターミナルFで最終的なVPAを実行
  const 最終ターミナルF: ターミナルF = {
    年: 入力.チューニング期間.終了年,
    F0: 最適化結果.最適値[0],
    F1: 最適化結果.最適値[1],
    F2: 最適化結果.最適値[2],
    F3: 最適化結果.最適値[3],
    F4: 最適化結果.最適値[4],
  };

  const 最終資源尾数 = calculateターミナル資源尾数(
    最終年漁獲尾数,
    最終ターミナルF,
    VPA入力データ.M
  );

  const 最終VPA結果 = runVPA({
    ...VPA入力データ,
    最近年の年齢別資源尾数: 最終資源尾数,
  });

  // 5. 最終的な指標パラメータを推定
  const 最終指標パラメータMap = new Map<資源量指標種別, 指標パラメータ>();
  const 最終VPA推定値リスト = new Map<資源量指標種別, readonly number[]>();

  for (const 指標値 of 入力.資源量指標値) {
    const VPA推定値 = extractVPA推定値(最終VPA結果, 指標値, 入力.チューニング期間);
    const 最小長 = Math.min(指標値.観測値.length, VPA推定値.length);
    const 観測値trim = 指標値.観測値.slice(0, 最小長);
    const VPA推定値trim = VPA推定値.slice(0, 最小長);

    最終VPA推定値リスト.set(指標値.種別, VPA推定値trim);

    const 固定b = 指標値.種別 === "産卵量";
    const params = estimate指標パラメータ(
      { ...指標値, 観測値: 観測値trim },
      VPA推定値trim,
      固定b
    );
    最終指標パラメータMap.set(指標値.種別, params);
  }

  // 6. 最終的な目的関数値を計算
  const 最終目的関数値 = calculate目的関数(
    最終ターミナルF,
    最終指標パラメータMap,
    入力.資源量指標値,
    最終VPA推定値リスト,
    直近3年F平均,
    λ
  );

  return {
    ターミナルF: 最終ターミナルF,
    指標パラメータ: 最終指標パラメータMap,
    目的関数値: 最終目的関数値,
    最適λ: λ,
    VPA結果: 最終VPA結果,
  };
}

/**
 * チューニングVPAを実行してターミナルFを推定する
 *
 * リッジVPAの目的関数（式7）を最小化することで、
 * 最近年の年齢別F（ターミナルF）を推定する
 *
 * アルゴリズム：
 * 1. 初期ターミナルFを設定（直近3年の平均）
 * 2. ターミナルFから最近年の資源尾数を計算
 * 3. 基本VPAで全期間の資源尾数とFを計算
 * 4. VPA結果から指標対応値を抽出
 * 5. 指標パラメータq, bを推定
 * 6. 目的関数を計算
 * 7. Nelder-Mead法でターミナルFを更新
 * 8. 収束まで2～7を繰り返す
 *
 * @param 入力 チューニングVPA入力データ
 * @param λ リッジペナルティ重み（省略時は0.45）またはnullでλ最適化
 * @returns チューニングVPA結果
 */
export function runチューニングVPA(
  入力: チューニングVPA入力,
  λ: リッジペナルティ重み = 0.45
): チューニングVPA結果 {
  logger.info("チューニングVPA開始", {
    指標数: 入力.資源量指標値.length,
    チューニング期間: 入力.チューニング期間,
    λ,
  });

  // コア実装を呼び出す
  const 結果 = runチューニングVPACore(入力, λ);

  logger.info("チューニングVPA完了", {
    最適F: [結果.ターミナルF.F0, 結果.ターミナルF.F1, 結果.ターミナルF.F2],
    目的関数値: 結果.目的関数値.合計,
  });

  return 結果;
}

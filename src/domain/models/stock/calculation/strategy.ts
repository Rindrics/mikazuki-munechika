import type { ABC算定結果 } from "../../../data";

/**
 * Available ABC calculation method names
 *
 * - コホート解析: 再生産関係を利用した将来予測の結果を利用して ABC を計算する
 * - 経験的解析（CPUE）: 漁獲量と資源量指標値（CPUE）の時系列データから経験的な式を用いて ABC を計算する
 * - 経験的解析（漁獲量）: 漁獲量の時系列データのみから経験的な式を用いて ABC を計算する
 */
export type ABC算定手法名 = "コホート解析" | "経験的解析（CPUE）" | "経験的解析（漁獲量）";

/**
 * Input data for ABC calculation
 *
 * Each Strategy can extend this interface to require additional data
 */
export interface ABC算定入力 {
  /** Estimated stock abundance (unit: tons) */
  資源量推定値: number;
}

/**
 * Strategy interface for ABC (Acceptable Biological Catch) calculation
 *
 * Implements the Strategy Pattern to allow swapping calculation methods:
 * - Type 1 (1系): Cohort Analysis
 * - Type 2 (2系): Empirical Method with CPUE
 * - Type 3 (3系): Empirical Catch Analysis
 *
 * @see ADR 0022 for design rationale
 */
export interface ABC算定Strategy {
  /** Name of the calculation method */
  readonly 手法名: ABC算定手法名;

  /**
   * Calculate ABC from input data
   *
   * @param 入力 - Input data for calculation
   * @returns ABC calculation result
   */
  算定(入力: ABC算定入力): ABC算定結果;
}

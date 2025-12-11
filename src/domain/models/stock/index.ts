import { 漁獲量データ, 生物学的データ, ABC算定結果 } from "../../data";
import { 資源タイプ, 資源名s, 資源グループ呼称s } from "../../constants";

/**
 * 評価対象資源の名前（呼称 + 系群名）
 *
 * @example
 * ```typescript
 * const name: 資源名 = "マイワシ太平洋系群";
 * ```
 */
export type 資源名 = (typeof 資源名s)[keyof typeof 資源名s];

export type 資源グループ呼称 = (typeof 資源グループ呼称s)[number];

/**
 * 資源の情報を保持
 *
 * @example
 * ```typescript
 * const stockGroup: 資源情報 = create資源情報(資源名.マイワシ太平洋);
 * stockGroup.呼称       // "マイワシ"
 * stockGroup.系群名     // "太平洋系群"
 * stockGroup.資源タイプ // 1
 * stockGroup.toDisplayString() // "マイワシ 太平洋系群"
 * stockGroup.toDisplayString((c, r) => `<span>${c}</span><span>${r}</span>`)
 * ```
 */
export interface 資源情報 {
  readonly 呼称: 資源グループ呼称;
  readonly 系群名: string;
  readonly 資源タイプ: 資源タイプ;
  equals(other: 資源情報): boolean;
  toString(): string;
  toDisplayString(formatter?: (呼称: string, 系群名: string) => string): string;
}

/**
 * 資源評価の状態を保持
 */
export interface 資源評価 {
  readonly 対象: 資源情報;
  readonly 資源量: string;
  資源量推定(catchData: 漁獲量データ, biologicalData: 生物学的データ): 資源評価;
  ABC算定(): ABC算定結果;
}

import { 漁獲量データ, 生物学的データ, ABC算定結果 } from "../../../data";
import { 資源タイプ, 資源名s, 資源グループ呼称s } from "../../../constants";
import { create資源情報, create資源評価 } from "../../../helpers";
import type { 評価ステータス } from "../status";

/**
 * 資源評価の年度を表す型
 */
export type 年度 = number;

/**
 * 評価対象資源の名前（呼称 + 系群名）
 *
 * @example
 * ```typescript
 * const name: 資源名 = "マイワシ太平洋系群";
 * ```
 */
export type 資源名 = (typeof 資源名s)[keyof typeof 資源名s];

export type 資源グループ呼称 = (typeof 資源グループ呼称s)[keyof typeof 資源グループ呼称s];

/**
 * 資源の情報を保持
 *
 * @example
 * ```typescript
 * import { create資源情報 } from "@/domain/helpers";
 * import { 資源名s } from "@/domain/constants";
 *
 * const stockGroup: 資源情報 = create資源情報(資源名s.マイワシ太平洋);
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
  /** URL パスで使用する英語 slug (ADR 0018) */
  readonly slug: string;
  equals(other: 資源情報): boolean;
  toString(): string;
  toDisplayString(formatter?: (呼称: string, 系群名: string) => string): string;
}

/**
 * 資源評価の状態を保持（基底インターフェース）
 */
export interface 資源評価<TStatus extends 評価ステータス = 評価ステータス> {
  readonly 対象: 資源情報;
  readonly 作業ステータス: TStatus;
  readonly 資源量: string;
  資源量推定(catchData: 漁獲量データ, biologicalData: 生物学的データ): 資源評価<TStatus>;
  ABC算定(): ABC算定結果;
}

/**
 * 未着手の資源評価
 */
export type 未着手資源評価 = 資源評価<"未着手">;

/**
 * 新年度評価初期化の結果
 */
export interface 新年度評価初期化結果 {
  readonly 年度: 年度;
  readonly 評価一覧: Map<資源名, 未着手資源評価>;
  toString(): string;
}

/**
 * 新年度の資源評価を初期化する
 *
 * @param 年度 - 初期化する年度
 * @returns 年度と評価一覧を含む初期化結果
 */
export function 新年度評価初期化(年度: 年度): 新年度評価初期化結果 {
  const 評価一覧 = new Map<資源名, 未着手資源評価>();
  for (const 資源名 of Object.values(資源名s)) {
    const 資源情報 = create資源情報(資源名);
    評価一覧.set(資源名, create資源評価(資源情報));
  }
  return {
    年度,
    評価一覧,
    toString() {
      return `${this.年度}年度 資源評価初期化完了（${this.評価一覧.size}件）`;
    },
  };
}

/**
 * 資源量を表す型
 */
export interface 資源量 {
  /** 資源量の値 */
  値: string;
  /** 単位 */
  単位: "トン";
}

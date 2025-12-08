import { USER_ROLES } from "./constants";
import { StockGroupName } from "./stock";
/**
 * 評価対象資源
 *
 * @example
 * ```typescript
 * const stockGroup: StockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);
 * stockGroup.call_name // "マイワシ"
 * stockGroup.region    // "太平洋系群"
 * stockGroup.toDisplayString() // "マイワシ 太平洋系群"
 * ```
 */
export interface StockGroup {
  readonly name: StockGroupName;
  readonly call_name: string;
  readonly region: string;
  /**
   * 他の系群と等しいかどうかを判定
   * @param other - 比較対象の系群
   * @returns 同じ系群であれば true
   */
  equals(other: StockGroup): boolean;
  /**
   * 系群名を文字列として返す
   * @returns 系群の完全名
   */
  toString(): string;
  /**
   * 表示用の文字列を返す
   * @param separator - 魚種名と地域名の間の区切り文字（デフォルト: " "）
   * @returns 表示用の文字列（例: "マイワシ 太平洋系群"）
   */
  toDisplayString(separator?: string): string;
}

/**
 * ユーザーの系群別ロール
 * 特定の系群に対するユーザーのロールを表す
 */
export interface UserStockGroupRole {
  /** 系群名 */
  stockGroupName: StockGroupName;
  /** ロール */
  role: UserRole;
}

/**
 * ユーザー
 * システムを利用するユーザーの情報
 *
 * ユーザーは系群ごとに異なるロールを持つことができる。
 * 例えば、マイワシ太平洋系群では主担当、ズワイガニオホーツク海系群では副担当など。
 */
export interface User {
  /** ユーザーID */
  id: string;
  /** メールアドレス */
  email: string;
  /**
   * 系群名をキー、ロールを値とするマップ
   *
   * @example
   * ```typescript
   * {
   *   "マイワシ太平洋系群": "主担当",
   *   "ズワイガニオホーツク海系群": "副担当"
   * }
   * ```
   */
  rolesByStockGroup: Partial<Record<StockGroupName, UserRole>>;
}

declare const __authenticated: unique symbol;
export type AuthenticatedUser = User & {
  readonly [__authenticated]: true;
};

/**
 * ユーザーロールの型
 * {@link USER_ROLES} の値のいずれか
 */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

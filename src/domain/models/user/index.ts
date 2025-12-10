import { ロールs } from "../../constants";
import { 資源名 } from "../stock";

export type ロール = (typeof ロールs)[keyof typeof ロールs];

/**
 * ある資源に対するロール割当て情報を表す
 *
 * @example
 * ```typescript
 * const assignment: 担当資源情報 = {
 *   担当資源名: 資源名.マイワシ太平洋,
 *   ロール: ロールs.主担当,
 * };
 * ```
 */
export interface 担当資源情報 {
  担当資源名: 資源名;
  ロール: ロール;
}

/**
 * ユーザー
 *
 * ユーザーは系群ごとに異なるロールsを持つことができる。
 */
export interface ユーザー {
  id: string;
  メールアドレス: string;
  担当資源情報リスト: Partial<Record<資源名, ロール>>;
}

declare const __authenticated: unique symbol;

/**
 * 認証済みユーザー
 */
export type 認証済ユーザー = ユーザー & {
  readonly [__authenticated]: true;
};

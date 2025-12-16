import { ロールs, 主担当ロール, 副担当ロール, 管理者ロール } from "../../constants";
import { 資源名 } from "../stock";

/** Internal symbol for authenticated user (implementation detail, not exported) */
declare const __authenticated: unique symbol;

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

export type 氏名 = string;

/**
 * Discriminator for user types
 */
export type ユーザー種別 = "評価担当者" | "資源評価管理者";

/**
 * ユーザー
 *
 * 本システムに登録されたユーザー
 */
export interface ユーザー {
  氏名: 氏名;
  メールアドレス: string;
}

/**
 * 評価担当者
 *
 * 資源評価を担当するユーザー。系群ごとに異なるロールを持つことができる
 */
export interface 評価担当者 extends ユーザー {
  種別: "評価担当者";
  担当資源情報リスト: Partial<Record<資源名, ロール>>;
}

/**
 * 資源評価管理者
 *
 * 資源評価業務を管理するユーザー
 */
export interface 資源評価管理者 extends ユーザー {
  種別: "資源評価管理者";
  ロール: typeof 管理者ロール;
}

/**
 * 認証済みユーザー
 *
 * Authenticated status is branded using a unique symbol.
 */
export type 認証済ユーザー = ユーザー & {
  readonly [__authenticated]: true;
};

/**
 * 認証済み評価担当者
 */
export type 認証済評価担当者 = 評価担当者 & {
  readonly [__authenticated]: true;
};

/**
 * 認証済み資源評価管理者
 */
export type 認証済資源評価管理者 = 資源評価管理者 & {
  readonly [__authenticated]: true;
};

/**
 * 主担当者を表す型
 */
export type 主担当者 = 認証済評価担当者 & {
  readonly 担当資源情報リスト: Partial<Record<資源名, typeof 主担当ロール>>;
};

/**
 * 副担当者を表す型
 */
export type 副担当者 = 認証済評価担当者 & {
  readonly 担当資源情報リスト: Partial<Record<資源名, typeof 副担当ロール>>;
};

export function is主担当者(user: 認証済評価担当者, 対象資源名: 資源名): user is 主担当者 {
  return user.担当資源情報リスト[対象資源名] === ロールs.主担当;
}

export function require主担当者(操作者: 認証済評価担当者, 対象資源名: 資源名): asserts 操作者 is 主担当者 {
  if (!is主担当者(操作者, 対象資源名)) {
    throw new Error("主担当者のみが操作できます");
  }
}

export function is資源評価管理者(操作者: 認証済資源評価管理者 | 副担当者): 操作者 is 認証済資源評価管理者 {
  return 操作者.種別 === "資源評価管理者";
}

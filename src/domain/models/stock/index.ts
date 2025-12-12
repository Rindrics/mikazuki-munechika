import { 漁獲量データ, 生物学的データ, ABC算定結果 } from "../../data";
import { 資源タイプ, 資源名s, 資源グループ呼称s, ロールs } from "../../constants";
import { 認証済ユーザー, 主担当者, 認証済評価担当者, 認証済資源評価管理者 } from "../user";

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
 * 資源評価の作業ステータスを管理する型
 */
export type 評価ステータス = "未着手" | "作業中" | "内部査読中" | "外部査読中" | "再検討中" | "受理済み";

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
 * Status-specific assessment types
 */
export type 未着手資源評価 = 資源評価<"未着手">;
export type 進行中資源評価 = 資源評価<"作業中">;
export type 内部査読中資源評価 = 資源評価<"内部査読中">;
export type 外部査読中資源評価 = 資源評価<"外部査読中">;
export type 再検討中資源評価 = 資源評価<"再検討中">;
export type 受理済み資源評価 = 資源評価<"受理済み">;

interface ステータス変化イベント {
  readonly 変化前: 評価ステータス;
  readonly 変化後: 評価ステータス;
  readonly 変化理由: string;
  readonly 日時: Date;
  readonly 操作者: 認証済ユーザー;
  toString(): string;
}

/**
 * 「未着手 → 作業中」のステータス変化を表す型
 */
const 作業着手イベント定義 = {
  変化前: "未着手",
  変化後: "作業中",
  変化理由: "作業着手",
} as const;

type 作業着手済み = ステータス変化イベント & typeof 作業着手イベント定義 & {
  readonly 操作者: 主担当者;
};

/**
 * 「作業中 → 内部査読中」のステータス変化を表す型
 */
const 内部査読依頼イベント定義 = {
  変化前: "作業中",
  変化後: "内部査読中",
  変化理由: "内部査読依頼",
} as const;

type 内部査読依頼済み = ステータス変化イベント & typeof 内部査読依頼イベント定義 & {
  readonly 操作者: 主担当者;
};


function is主担当者(user: 認証済評価担当者, 対象資源名: 資源名): user is 主担当者 {
  return user.担当資源情報リスト[対象資源名] === ロールs.主担当;
}

function require主担当者(操作者: 認証済評価担当者, 対象資源名: 資源名): asserts 操作者 is 主担当者 {
  if (!is主担当者(操作者, 対象資源名)) {
    throw new Error("主担当者のみが操作できます");
  }
}

function ステータス遷移<
  TOperator extends 認証済ユーザー,
  TDef extends { readonly 変化前: 評価ステータス; readonly 変化後: 評価ステータス; readonly 変化理由: string }
>(
  対象資源評価: 資源評価,
  日時: Date,
  操作者: TOperator,
  イベント定義: TDef
): { 更新後資源評価: 資源評価<TDef["変化後"]>; イベント: ステータス変化イベント & TDef & { readonly 操作者: TOperator } } {
  const 更新後資源評価 = Object.create(
    Object.getPrototypeOf(対象資源評価),
    {
      ...Object.getOwnPropertyDescriptors(対象資源評価),
      作業ステータス: { value: イベント定義.変化後, writable: false, enumerable: true },
    }
  ) as 資源評価<TDef["変化後"]>;

  const イベント = {
    ...イベント定義,
    日時,
    操作者,
    toString() {
      return `${this.変化前} → ${this.変化後} by ${this.操作者.氏名} at ${this.日時.toISOString()}`;
    },
  };

  return { 更新後資源評価, イベント };
}

export function 作業着手(
  対象資源評価: 資源評価,
  日時: Date,
  操作者: 認証済評価担当者
): { 進行中資源評価: 進行中資源評価; 作業着手済み: 作業着手済み } {
  const 対象資源名 = 対象資源評価.対象.toString() as 資源名;
  require主担当者(操作者, 対象資源名);

  const { 更新後資源評価: 進行中資源評価, イベント: 作業着手済み } = ステータス遷移(対象資源評価, 日時, 操作者, 作業着手イベント定義);
  return { 進行中資源評価, 作業着手済み };
}

export function 内部査読依頼(
  対象資源評価: 資源評価,
  日時: Date,
  操作者: 認証済評価担当者
): { 内部査読待ち資源評価: 内部査読中資源評価; 内部査読依頼済み: 内部査読依頼済み } {
  const 対象資源名 = 対象資源評価.対象.toString() as 資源名;
  require主担当者(操作者, 対象資源名);

  const { 更新後資源評価: 内部査読待ち資源評価, イベント: 内部査読依頼済み } = ステータス遷移(対象資源評価, 日時, 操作者, 内部査読依頼イベント定義);
  return { 内部査読待ち資源評価, 内部査読依頼済み };
}

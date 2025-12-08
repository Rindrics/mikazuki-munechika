/**
 * 生物学的許容漁獲量（ABC: Acceptable Biological Catch）
 * 資源評価の結果として算出される、持続可能な漁獲量の上限値
 */
export interface AcceptableBiologicalCatch {
  /** ABC の値 */
  value: string;
}

/**
 * 漁獲データ
 * 資源評価に使用する漁獲量や漁獲努力量などのデータ
 */
export interface CatchData {
  /** 漁獲データの値 */
  value: string;
}

/**
 * 生物学的データ
 * 資源評価に使用する年齢組成、成長率、自然死亡率などのデータ
 */
export interface BiologicalData {
  /** 生物学的データの値 */
  value: string;
}

/**
 * 系群の階層構造定義
 * 魚種（species）とその地域系群（regions）を階層的に管理
 *
 * @example
 * ```typescript
 * STOCK_GROUPS.MAIWASHI.species // "マイワシ"
 * STOCK_GROUPS.MAIWASHI.regions.PACIFIC // "太平洋系群"
 * ```
 */
export const STOCK_GROUPS = {
  /** マイワシ */
  MAIWASHI: {
    name: "マイワシ",
    species: ["マイワシ"],
    regions: {
      /** 太平洋系群 */
      PACIFIC: "太平洋系群",
      /** 対馬暖流系群 */
      TSUSHIMA: "対馬暖流系群",
    },
  },
  MACHIRUI: {
    name: "マチ類",
    species: ["アオダイ", "ハマダイ", "ヒメダイ", "オオヒメ"],
    regions: {
      ANAMI_OKIBNAWA_SAKISHIMA: "奄美諸島・沖縄諸島・先島諸島",
    },
  },
  /** ズワイガニ */
  ZUWAIGANI: {
    name: "ズワイガニ",
    species: ["ズワイガニ"],
    regions: {
      /** オホーツク海系群 */
      OKHOTSK: "オホーツク海系群",
    },
  },
} as const;

/**
 * 系群名の定数
 * 系群の完全名（魚種名 + 地域名）を提供
 *
 * @example
 * ```typescript
 * STOCK_GROUP_NAMES.MAIWASHI_PACIFIC // "マイワシ太平洋系群"
 * ```
 */
export const STOCK_GROUP_NAMES = {
  /** マイワシ太平洋系群 */
  MAIWASHI_PACIFIC: `${STOCK_GROUPS.MAIWASHI.name}${STOCK_GROUPS.MAIWASHI.regions.PACIFIC}`,
  /** マイワシ対馬暖流系群 */
  MAIWASHI_TSUSHIMA: `${STOCK_GROUPS.MAIWASHI.name}${STOCK_GROUPS.MAIWASHI.regions.TSUSHIMA}`,
  /** ズワイガニオホーツク海系群 */
  ZUWAIGANI_OKHOTSK: `${STOCK_GROUPS.ZUWAIGANI.name}${STOCK_GROUPS.ZUWAIGANI.regions.OKHOTSK}`,
} as const;

/**
 * 系群名の型
 * {@link STOCK_GROUP_NAMES} の値のいずれか
 */
export type StockGroupName =
  (typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];

/**
 * 系群（Stock Group）
 * 資源評価の対象となる魚種の地域個体群
 *
 * @example
 * ```typescript
 * const stockGroup: StockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);
 * stockGroup.species // "マイワシ"
 * stockGroup.region  // "太平洋系群"
 * stockGroup.toDisplayString() // "マイワシ 太平洋系群"
 * ```
 */
export interface StockGroup {
  /** 系群の完全名（例: "マイワシ太平洋系群"） */
  readonly name: StockGroupName;
  /** 魚種名（例: "マイワシ"） */
  readonly species: string;
  /** 地域名（例: "太平洋系群"） */
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
 * ユーザーロールの定数
 *
 * - PRIMARY: 主担当 - 資源評価の主担当者
 * - SECONDARY: 副担当 - 資源評価の副担当者
 * - ADMIN: 管理者 - システム管理者
 */
export const USER_ROLES = {
  /** 主担当 - 資源評価の主担当者 */
  PRIMARY: "主担当",
  /** 副担当 - 資源評価の副担当者 */
  SECONDARY: "副担当",
  /** 管理者 - システム管理者 */
  ADMIN: "管理者",
} as const;

/**
 * ユーザーロールの型
 * {@link USER_ROLES} の値のいずれか
 */
export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

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

/**
 * 認証済みユーザー
 * ログイン済みであることが型レベルで保証されたユーザー
 *
 * @see {@link toAuthenticatedUser} - User を AuthenticatedUser に変換する関数
 */
declare const __authenticated: unique symbol;
export type AuthenticatedUser = User & {
  readonly [__authenticated]: true;
};

/**
 * User を AuthenticatedUser に変換する
 * 認証処理が成功した後に呼び出す
 *
 * @param user - 認証されたユーザー
 * @returns 認証済みユーザー
 */
export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return user as AuthenticatedUser;
}

/**
 * ユーザーの系群別ロール一覧を取得する
 *
 * @param user - ユーザー
 * @returns 系群別ロールの配列
 *
 * @example
 * ```typescript
 * const roles = getUserStockGroupRoles(user);
 * // [
 * //   { stockGroupName: "マイワシ太平洋系群", role: "主担当" },
 * //   { stockGroupName: "ズワイガニオホーツク海系群", role: "副担当" }
 * // ]
 * ```
 */
export function getUserStockGroupRoles(user: User): UserStockGroupRole[] {
  return Object.entries(user.rolesByStockGroup)
    .filter(([_, role]) => role !== undefined)
    .map(([stockGroupName, role]) => ({
      stockGroupName: stockGroupName as StockGroupName,
      role: role!,
    }));
}

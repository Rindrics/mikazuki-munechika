import type { ABC算定結果, 漁獲量データ, 生物学的データ, 資源量指標値データ } from "@/domain/data";

/**
 * Available ABC calculation method names
 *
 * - コホート解析: 再生産関係を利用した将来予測の結果を利用して ABC を計算する
 * - 経験的解析（CPUE）: 漁獲量と資源量指標値（CPUE）の時系列データから経験的な式を用いて ABC を計算する
 * - 経験的解析（漁獲量）: 漁獲量の時系列データのみから経験的な式を用いて ABC を計算する
 */
export type ABC算定手法名 = "コホート解析" | "経験的解析（CPUE）" | "経験的解析（漁獲量）";

// =============================================================================
// Common types
// =============================================================================

/**
 * ABC 算定の入力データ（基底インターフェース）
 *
 * 各 Strategy は必要に応じてこのインターフェースを拡張する。
 */
export interface ABC算定入力 {
  漁獲量: 漁獲量データ;
}

/**
 * コホート解析の入力データ
 */
export interface コホート解析入力 extends ABC算定入力 {
  生物データ: 生物学的データ;
  M: M;
}

/**
 * 経験的解析（CPUE）の入力データ
 */
export interface 経験的解析CPUE入力 extends ABC算定入力 {
  資源量指標値: 資源量指標値データ;
}

/**
 * 経験的解析（漁獲量）の入力データ
 */
export interface 経験的解析漁獲量入力 extends ABC算定入力 {
  // 漁獲量のみ（基底インターフェースと同じ）
}

/**
 * ABC 算定の Strategy インターフェース
 *
 * ジェネリクス T で入力データの型を指定する。
 * - 1系（コホート解析）: T = コホート解析入力
 * - 3系（経験的解析）: T = 経験的解析入力
 *
 * @see ADR 0022 for design rationale
 */
export interface ABC算定Strategy<T extends ABC算定入力 = ABC算定入力> {
  readonly 手法名: ABC算定手法名;

  /**
   * ABC を算定する
   *
   * @param 入力 - 入力データ
   * @returns ABC 算定結果
   */
  算定(入力: T): ABC算定結果;
}

// =============================================================================
// 確率分布
// =============================================================================

/**
 * 確率分布インターフェイス
 *
 * 自然死亡係数（M）などの確率分布を表すインターフェイス
 */
export interface 確率分布 {
  readonly 分布名: string;
  readonly 平均値: number;
  readonly 分散: number;
  sample(): number;
}

/**
 * 正規分布を生成する
 *
 * @param 平均値
 * @param 標準偏差
 * @returns 正規分布オブジェクト
 *
 * @example
 * ```typescript
 * const dist = 正規分布(0.4, 0.1);
 * dist.sample(); // 正規分布 N(0.4, 0.1) からランダムに値をサンプルする
 * ```
 */
export function 正規分布(平均値: number, 標準偏差: number): 確率分布 {
  const 分散 = 標準偏差 * 標準偏差;
  return {
    分布名: "正規分布",
    平均値: 平均値,
    分散: 分散,
    sample(): number {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return 平均値 + 分散 * z;
    },
  };
}

/**
 * 固定値を確率分布の特殊ケースとして生成する
 *
 * @param value
 * @returns 固定値
 *
 * @example
 * ```typescript
 * const dist = 固定値(0.4);
 * dist.sample(); // 常に 0.4 を返す
 * ```
 */
export function 固定値(value: number): 確率分布 {
  return {
    分布名: "固定値",
    平均値: value,
    分散: 0,
    sample(): number {
      return value;
    },
  };
}

// =============================================================================
// 単位（Unit）
// =============================================================================

/**
 * データの単位を表す文字列リテラル型
 *
 * 型パラメータとして使用することで、異なる単位のデータを型レベルで区別できる。
 *
 * @see ADR 0024 for design rationale
 */
export type 単位 = "トン" | "千尾" | "尾" | "無次元";

/**
 * 単位ごとのフォーマット関数
 *
 * 値を人間が読みやすい形式に変換する。
 */
export const 単位フォーマッタ: Record<単位, (値: number) => string> = {
  トン: (値) => (値 >= 1000 ? `${(値 / 1000).toFixed(1)} 千トン` : `${値.toFixed(1)} トン`),
  千尾: (値) => (値 >= 1000 ? `${(値 / 1000).toFixed(2)} 百万尾` : `${値.toFixed(1)} 千尾`),
  尾: (値) => (値 >= 1_000_000 ? `${(値 / 1_000_000).toFixed(2)} 百万尾` : `${値.toLocaleString()} 尾`),
  無次元: (値) => 値.toFixed(3),
};

// =============================================================================
// 年齢年行列（Age-Year Matrix）
// =============================================================================

/**
 * 年齢 × 年 の 2 次元データを表す行列
 *
 * 年齢別資源尾数、親魚量、加入量などの時系列データを格納する。
 * メタデータ（年範囲、年齢範囲、単位）を保持し、アクセサメソッドでインデックス変換を隠蔽する。
 *
 * 型パラメータ U で単位を追跡し、異なる単位のデータの混入を防ぐ。
 *
 * @see ADR 0023 for matrix design rationale
 * @see ADR 0024 for unit design rationale
 *
 * @example
 * ```typescript
 * const matrix = create年齢年行列({
 *   単位: "トン",
 *   年範囲: { 開始年: 2015, 終了年: 2024 },
 *   年齢範囲: { 最小年齢: 0, 最大年齢: 10 },
 *   データ: [[...], [...], ...],
 * });
 * matrix.get(2020, 3);          // 15000 (number)
 * matrix.getFormatted(2020, 3); // "15.0 千トン" (string)
 * ```
 */
export interface 年齢年行列<U extends 単位 = 単位> {
  readonly 単位: U;
  readonly 年範囲: { 開始年: number; 終了年: number };
  readonly 年齢範囲: { 最小年齢: number; 最大年齢: number };
  readonly データ: readonly (readonly number[])[];

  /**
   * 指定した年・年齢の値を取得する
   *
   * @param 年 - 対象年
   * @param 年齢 - 対象年齢
   * @returns 値
   * @throws 範囲外の年・年齢を指定した場合
   */
  get(年: number, 年齢: number): number;

  /**
   * 指定した年・年齢の値をフォーマットして取得
   *
   * @param 年 - 対象年
   * @param 年齢 - 対象年齢
   * @returns フォーマット済みの文字列
   */
  getFormatted(年: number, 年齢: number): string;
}

/**
 * 年齢年行列を生成する
 *
 * @param params - 年齢年行列のパラメータ
 * @returns 年齢年行列
 */
export function create年齢年行列<U extends 単位>(params: {
  単位: U;
  年範囲: { 開始年: number; 終了年: number };
  年齢範囲: { 最小年齢: number; 最大年齢: number };
  データ: number[][];
}): 年齢年行列<U> {
  const { 単位: unit, 年範囲, 年齢範囲, データ } = params;
  const formatter = 単位フォーマッタ[unit];

  return {
    単位: unit,
    年範囲,
    年齢範囲,
    データ,
    get(年: number, 年齢: number): number {
      const 年インデックス = 年 - 年範囲.開始年;
      const 年齢インデックス = 年齢 - 年齢範囲.最小年齢;

      if (年インデックス < 0 || 年インデックス >= データ.length) {
        throw new Error(`年 ${年} は範囲外です（${年範囲.開始年}〜${年範囲.終了年}）`);
      }
      if (年齢インデックス < 0 || 年齢インデックス >= データ[年インデックス].length) {
        throw new Error(`年齢 ${年齢} は範囲外です（${年齢範囲.最小年齢}〜${年齢範囲.最大年齢}）`);
      }

      return データ[年インデックス][年齢インデックス];
    },
    getFormatted(年: number, 年齢: number): string {
      return formatter(this.get(年, 年齢));
    },
  };
}

// =============================================================================
// 1系
// =============================================================================

/**
 * M（自然死亡係数）
 *
 * 任意の年齢に対する M（自然死亡係数）の確率分布を表す型
 * 利用例:
 * - 固定値: (年齢) => 固定値(0.4)
 * - 年齢依存分布: (年齢) => 正規分布(年齢 < 3 ? 0.6 : 0.3, 0.1)
 * - 年齢非依存分布: (年齢) => 正規分布(0.4, 0.1)
 *
 * @param 年齢
 * @returns 自然死亡係数 M の確率分布
 */
export type M = (年齢: number) => 確率分布;

/**
 * コホート解析用データ
 *
 * 一次処理の出力。生データを整形・前処理した結果。
 * このデータを使って前年までのコホート解析（VPA）を実行する。
 */
export interface コホート解析用データ {
  漁獲量行列: 年齢年行列<"トン">;
  体重行列: 年齢年行列<"トン">;
  成熟率行列: 年齢年行列<"無次元">;
  M: M;
}

/**
 * 資源計算結果（基底インターフェース）
 *
 * 前年までのコホート解析・前進計算の出力。最終年までの年齢別資源尾数、親魚量、加入量を保持する。
 */
interface 資源計算結果Base {
  最終年: number;
  年齢別資源尾数: 年齢年行列<"千尾">;
  親魚量: 年齢年行列<"トン">;
  加入量: 年齢年行列<"千尾">;
}

/**
 * 前年までの資源計算結果
 *
 * 前年までのコホート解析（VPA）の出力。
 * Branded Type により翌年資源計算結果と型レベルで区別される。
 *
 * @see ADR 0025 for design rationale
 */
export type 前年までの資源計算結果 = 資源計算結果Base & { readonly __kind: "前年まで" };

/**
 * 翌年までの資源計算結果
 *
 * 前進計算の出力。Branded Type により前年までの資源計算結果と型レベルで区別される。
 *
 * @see ADR 0025 for design rationale
 */
export type 翌年資源計算結果 = 資源計算結果Base & { readonly __kind: "翌年" };

// Backward compatibility alias
/** @deprecated Use 前年までの資源計算結果 instead */
export type 当年資源計算結果 = 前年までの資源計算結果;

/**
 * 再生産関係の残差
 */
export interface 再生産関係残差 {
  残差: number[];
}

/**
 * 漁獲死亡係数 F
 */
export interface F {
  値: number;
}

/**
 * 将来予測結果
 */
export interface 将来予測結果 {
  将来予測終了年: number;
  年別資源量: 年齢年行列<"トン">;
  年別漁獲量: 年齢年行列<"千尾">;
}

/**
 * 漁獲管理規則
 */
export interface 漁獲管理規則 {
  目標F: number;
  禁漁水準: number;
  限界管理基準値: number;
  目標管理基準値: number;
}

/**
 * 調整係数 β
 */
export interface 調整係数β {
  /** β value (0.0 - 1.0) */
  値: number;
}

/**
 * コホート解析 Strategy
 *
 * ABC 算定フロー:
 * 1. 一次処理: 生データを整形してコホート解析用データを作成
 * 2. 前年までのコホート解析: VPA を実行して前年までの資源計算結果を得る
 * 3. 前進計算: 翌年までの資源計算（再生産関係の残差リサンプリング）
 * 4. 将来予測: 将来の資源量・漁獲量を予測
 * 5. ABC決定: 漁獲管理規則と調整係数βから ABC を決定
 *
 * @see ADR 0022 for design rationale
 */
export interface コホート解析Strategy extends ABC算定Strategy<コホート解析入力> {
  readonly 手法名: "コホート解析";

  /**
   * Step 1: 一次処理
   *
   * 生データを整形・前処理してコホート解析用データを作成する。
   */
  一次処理(入力: コホート解析入力): コホート解析用データ;

  /**
   * Step 2: 前年までのコホート解析（VPA）
   *
   * コホート解析用データを使って VPA を実行し、前年までの資源計算結果を得る。
   *
   * @param データ - コホート解析用データ
   * @param M - 自然死亡係数
   * @param 資源量指標値 - 資源量指標値（CPUE等）
   */
  前年までのコホート解析(
    データ: コホート解析用データ,
    M: M,
    資源量指標値: 資源量指標値データ,
  ): 前年までの資源計算結果;

  /**
   * Step 3: 前進計算
   *
   * 前年までの結果に再生産関係の残差をリサンプリングして翌年までの資源計算結果を得る。
   */
  前進計算(前年結果: 前年までの資源計算結果, 残差: 再生産関係残差): 翌年資源計算結果;

  /**
   * Step 4: 将来予測
   */
  将来予測(翌年結果: 翌年資源計算結果, F: F, 予測年数: number): 将来予測結果;

  /**
   * Step 5: ABC 決定
   */
  ABC決定(予測結果: 将来予測結果, 規則: 漁獲管理規則, β: 調整係数β): ABC算定結果;
}

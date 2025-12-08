import { StockGroup } from "../models";
import { CatchData, BiologicalData, AcceptableBiologicalCatch } from "../data";
import { STOCK_GROUP_NAMES } from "../constants";
  
/**
 * @module fishery-stock
 * 水産資源（FisheryStock）の実装
 *
 * 資源評価の対象となる水産資源を表すクラス群。
 * 資源の種類（Type1, Type2, Type3）によって評価手法が異なる。
 */

/**
 * 水産資源の基底クラス
 *
 * すべての水産資源に共通する機能を提供する抽象クラス。
 * 具体的な評価手法は派生クラス（Type1Stock, Type2Stock, Type3Stock）で実装する。
 *
 * @abstract
 */
export abstract class FisheryStockBase {
private static nextId: number = 1;

/** 資源の一意識別子 */
readonly id: number;

/** 資源が属する系群 */
readonly stockGroup: StockGroup;

#abundance: string | undefined;

/**
 * @param stockGroup - 資源が属する系群
 */
constructor(stockGroup: StockGroup) {
    this.id = FisheryStockBase.nextId++;
    this.stockGroup = stockGroup;
}

/**
 * 資源名（系群の完全名）
 */
get name(): string {
    return this.stockGroup.name;
}

/**
 * 資源評価手法の参照文献URL
 * @abstract
 */
abstract readonly reference: string;

/**
 * 資源量
 * @throws 資源量が推定されていない場合
 */
get abundance(): string {
    if (this.#abundance === undefined) {
    throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
    }
    return this.#abundance;
}

/**
 * 資源量を推定する
 *
 * 漁獲データと生物学的データを用いて資源量を推定し、
 * 結果を内部状態として保持する。
 *
 * @param catchData - 漁獲データ
 * @param biologicalData - 生物学的データ
 * @returns 資源量が設定された自身のインスタンス（メソッドチェーン用）
 *
 * @example
 * ```typescript
 * const stock = new Type1Stock(createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC));
 * stock.estimateAbundance(catchData, biologicalData).assess();
 * ```
 */
estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): this {
    this.#abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
    return this;
}

/**
 * ABC（生物学的許容漁獲量）を評価する
 *
 * 資源量の推定結果に基づいてABCを算出する。
 * 評価手法は資源の種類（Type1, Type2, Type3）によって異なる。
 *
 * @abstract
 * @returns ABC の評価結果
 * @throws 資源量が推定されていない場合
 */
abstract assess(): AcceptableBiologicalCatch;
}

/**
 * 1系資源
 *
 * 再生産関係を用いたシミュレーションでABCを算出する資源。
 * 主にデータが豊富な主要魚種に適用される。
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf 参照文献}
 *
 * @example
 * ```typescript
 * const stock = new Type1Stock(createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC));
 * const abc = stock.estimateAbundance(catchData, biologicalData).assess();
 * ```
 */
export class Type1Stock extends FisheryStockBase {
readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf";

/**
 * 再生産関係を用いたシミュレーションでABCを評価
 */
assess(): AcceptableBiologicalCatch {
    return {
    value: `Simulated WITH recruitment using its abundance "${this.abundance}"`,
    };
}
}

/**
 * 2系資源
 *
 * 再生産関係を用いないシミュレーションでABCを算出する資源。
 * データが限られている場合に適用される。
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf 参照文献}
 */
export class Type2Stock extends FisheryStockBase {
readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

/**
 * 再生産関係を用いないシミュレーションでABCを評価
 */
assess(): AcceptableBiologicalCatch {
    return {
    value: `Simulated WITHOUT recruitment using its abundance "${this.abundance}"`,
    };
}
}

/**
 * 3系資源
 *
 * 直接的な手法でABCを算出する資源。
 * シミュレーションを行わず、経験則に基づく手法を用いる。
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf 参照文献}
 */
export class Type3Stock extends FisheryStockBase {
readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

/**
 * 直接的な手法でABCを評価
 */
assess(): AcceptableBiologicalCatch {
    return {
    value: `ABC estimated DIRECTLY using its abundance "${this.abundance}"`,
    };
}
}

/**
 * 水産資源の型
 *
 * 1系、2系、3系のいずれかの資源を表すユニオン型。
 * 資源の種類によって評価手法が異なるが、共通のインターフェイスで扱える。
 *
 * - {@link Type1Stock} - 再生産関係を用いたシミュレーション
 * - {@link Type2Stock} - 再生産関係を用いないシミュレーション
 * - {@link Type3Stock} - 直接的な評価手法
 */
export type FisheryStock = Type1Stock | Type2Stock | Type3Stock;


/**
 * 各資源名の型
 * {@link STOCK_GROUP_NAMES} の値のいずれか
 */
export type StockGroupName =
(typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];
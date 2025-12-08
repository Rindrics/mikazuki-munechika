import { StockGroup } from "../models";
import { CatchData, BiologicalData, AcceptableBiologicalCatch } from "../data";
import { STOCK_GROUPS } from "../constants";

/**
 * @module fishery-stock
 * 水産資源（FisheryStock）
 *
 * 資源評価の対象となる水産資源を表す。
 * 資源の種類（1系, 2系, 3系）によって評価手法が異なる。
 */

/**
 * 水産資源
 *
 * 資源評価の対象となる水産資源を表すインターフェース。
 */
export interface FisheryStock {
  /** 資源が属する系群 */
  readonly stockGroup: StockGroup;

  /** 資源名（系群の完全名） */
  readonly name: string;

  /** 資源評価手法の参照文献URL */
  readonly reference: string;

  /** 資源量（推定後に取得可能） */
  readonly abundance: string;

  /**
   * 資源量を推定する
   *
   * @param catchData - 漁獲データ
   * @param biologicalData - 生物学的データ
   * @returns 資源量が設定された自身のインスタンス（メソッドチェーン用）
   */
  estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): FisheryStock;

  /**
   * ABC（生物学的許容漁獲量）を評価する
   *
   * @returns ABC の評価結果
   * @throws 資源量が推定されていない場合
   */
  assess(): AcceptableBiologicalCatch;
}

/**
 * 1系資源を生成する
 *
 * 再生産関係を用いたシミュレーションでABCを算出する資源。
 * 主にデータが豊富な主要魚種に適用される。
 *
 * @param stockGroup - 資源が属する系群
 * @returns 1系資源
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf 参照文献}
 *
 * @example
 * ```typescript
 * const stock = createType1Stock(createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC));
 * const abc = stock.estimateAbundance(catchData, biologicalData).assess();
 * ```
 */
export function createType1Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf",
    assess: (abundance) => ({
      value: `Simulated WITH recruitment using its abundance "${abundance}"`,
    }),
  });
}

/**
 * 2系資源を生成する
 *
 * 再生産関係を用いないシミュレーションでABCを算出する資源。
 * データが限られている場合に適用される。
 *
 * @param stockGroup - 資源が属する系群
 * @returns 2系資源
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf 参照文献}
 */
export function createType2Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
      value: `Simulated WITHOUT recruitment using its abundance "${abundance}"`,
    }),
  });
}

/**
 * 3系資源を生成する
 *
 * 直接的な手法でABCを算出する資源。
 * シミュレーションを行わず、経験則に基づく手法を用いる。
 *
 * @param stockGroup - 資源が属する系群
 * @returns 3系資源
 *
 * @see {@link https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf 参照文献}
 */
export function createType3Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
      value: `ABC estimated DIRECTLY using its abundance "${abundance}"`,
    }),
  });
}

// --- Internal implementation (hidden from public API) ---

interface StockConfig {
  reference: string;
  assess: (abundance: string) => AcceptableBiologicalCatch;
}

function createStock(stockGroup: StockGroup, config: StockConfig): FisheryStock {
  let abundance: string | undefined;

  return {
    stockGroup,
    get name() {
      return stockGroup.name;
    },
    reference: config.reference,
    get abundance() {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
      }
      return abundance;
    },
    estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): FisheryStock {
      abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
      return this;
    },
    assess(): AcceptableBiologicalCatch {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
      }
      return config.assess(abundance);
    },
  };
}

/**
 * 各資源名の型
 * {@link STOCK_GROUP_NAMES} の値のいずれか
 */
export type StockGroupName =
  (typeof STOCK_GROUPS)[keyof typeof STOCK_GROUPS]["call_name"] extends string
    ? `${(typeof STOCK_GROUPS)[keyof typeof STOCK_GROUPS]["call_name"]}${string}`
    : never;

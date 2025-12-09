import { CatchData, BiologicalData, AcceptableBiologicalCatch } from "../../data";
import { STOCK_GROUPS, StockType } from "../../constants";

export type StockGroupName =
  (typeof STOCK_GROUPS)[keyof typeof STOCK_GROUPS]["call_name"] extends string
    ? `${(typeof STOCK_GROUPS)[keyof typeof STOCK_GROUPS]["call_name"]}${string}`
    : never;

/**
 * 評価対象資源
 *
 * @example
 * ```typescript
 * const stockGroup: StockGroup = createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC);
 * stockGroup.call_name // "マイワシ"
 * stockGroup.region    // "太平洋系群"
 * stockGroup.type      // 1
 * stockGroup.toDisplayString() // "マイワシ 太平洋系群"
 * ```
 */
export interface StockGroup {
  readonly name: StockGroupName;
  readonly call_name: string;
  readonly region: string;
  readonly type: StockType;
  equals(other: StockGroup): boolean;
  toString(): string;
  toDisplayString(separator?: string): string;
}

/**
 * 水産資源
 *
 * 資源評価の対象となる水産資源を表すインターフェース。
 */
export interface FisheryStock {
  readonly stockGroup: StockGroup;
  readonly name: string;
  readonly reference: string;
  readonly abundance: string;
  estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): FisheryStock;
  assess(): AcceptableBiologicalCatch;
}

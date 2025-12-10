import { CatchData, BiologicalData, AcceptableBiologicalCatch } from "../../data";
import { STOCK_GROUP_NAMES, StockType } from "../../constants";

/**
 * 評価対象資源の名前（呼称 + 系群名）
 *
 * @useDeclaredType
 * @example
 * ```typescript
 * const name: StockGroupName = "マイワシ太平洋系群";
 * ```
 */
export type StockGroupName = (typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];

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
 * stockGroup.toDisplayString((c, r) => `<span>${c}</span><span>${r}</span>`)
 * ```
 */
export interface StockGroup {
  readonly name: StockGroupName;
  readonly call_name: string;
  readonly region: string;
  readonly type: StockType;
  equals(other: StockGroup): boolean;
  toString(): string;
  toDisplayString(formatter?: (callName: string, region: string) => string): string;
  /**
   * Returns the full name (call_name + region) as StockGroupName type
   */
  fullName(): StockGroupName;
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

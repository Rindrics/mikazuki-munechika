/**
 * @module calculate-abc
 * ABC（生物学的許容漁獲量）算出サービス
 */

import { FisheryStock, CatchData, BiologicalData, AcceptableBiologicalCatch } from "@/domain";
import { logger } from "@/utils/logger";

/**
 * ABC（生物学的許容漁獲量）を算出する
 *
 * 漁獲データと生物学的データを用いて資源量を推定し、
 * その結果に基づいてABCを評価する。
 *
 * @param stock - 評価対象の水産資源
 * @param catchData - 漁獲データ
 * @param biologicalData - 生物学的データ
 * @returns ABC の評価結果
 *
 * @example
 * ```typescript
 * const stock = createType1Stock(createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC));
 * const abc = calculateAbc(stock, catchData, biologicalData);
 * console.log(abc.value);
 * ```
 */
export function calculateAbc(
  stock: FisheryStock,
  catchData: CatchData,
  biologicalData: BiologicalData
): AcceptableBiologicalCatch {
  logger.debug("calculateAbc called", { stockName: stock.name });

  const result = stock.estimateAbundance(catchData, biologicalData).assess();

  logger.debug("calculateAbc completed", { result: result.value });
  return result;
}

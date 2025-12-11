/**
 * @module calculate-abc
 * ABC（生物学的許容漁獲量）算出サービス
 */

import { 資源評価, 漁獲量データ, 生物学的データ, ABC算定結果 } from "@/domain";
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
 * const stock = createType1Stock(create資源情報(資源名.マイワシ太平洋));
 * const abc = calculateAbc(stock, catchData, biologicalData);
 * console.log(abc.value);
 * ```
 */
export function calculateAbc(
  stock: 資源評価,
  catchData: 漁獲量データ,
  biologicalData: 生物学的データ
): ABC算定結果 {
  logger.debug("calculateAbc called", { stockName: stock.対象 });

  const result = stock.資源量推定(catchData, biologicalData).ABC算定();

  logger.debug("calculateAbc completed", { result: result.value });
  return result;
}

/**
 * @module get-assessment-results
 * 資源評価結果取得サービス
 */

import { AssessmentResultRepository, FisheryStock, AcceptableBiologicalCatch } from "@/domain";
import { logger } from "@/utils/logger";

/**
 * 資源評価結果取得サービス
 *
 * 複数の水産資源に対する評価結果をリポジトリから取得する。
 */
export class GetAssessmentResultsService {
  /**
   * @param repository - 評価結果リポジトリ
   */
  constructor(private repository: AssessmentResultRepository) {}

  /**
   * 複数の水産資源の評価結果を取得する
   *
   * @param stocks - 評価結果を取得する水産資源の配列
   * @returns 各資源とその評価結果のペアの配列。評価結果がない場合は undefined
   *
   * @example
   * ```typescript
   * const service = new GetAssessmentResultsService(repository);
   * const results = await service.execute(stocks);
   * for (const { stock, result } of results) {
   *   if (result) {
   *     console.log(`${stock.name}: ${result.value}`);
   *   }
   * }
   * ```
   */
  async execute(
    stocks: FisheryStock[]
  ): Promise<Array<{ stock: FisheryStock; result: AcceptableBiologicalCatch | undefined }>> {
    logger.debug("execute called", { stockCount: stocks.length });

    try {
      const results = await Promise.all(
        stocks.map(async (stock) => {
          const result = await this.repository.findByStockName(stock.name);
          return { stock, result };
        })
      );

      logger.debug("execute completed", { resultCount: results.length });
      return results;
    } catch (error) {
      logger.error("execute failed", { stockCount: stocks.length }, error as Error);
      throw error;
    }
  }
}

/**
 * @module save-assessment-result
 * 資源評価結果保存サービス
 */

import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";
import { logger } from "@/utils/logger";

/**
 * 資源評価結果保存サービス
 *
 * 水産資源の評価結果をリポジトリに保存する。
 */
export class SaveAssessmentResultService {
  /**
   * @param repository - 評価結果リポジトリ
   */
  constructor(private repository: AssessmentResultRepository) {}

  /**
   * 評価結果を保存する
   *
   * @param stock - 評価対象の水産資源
   * @param result - 保存する評価結果（ABC）
   *
   * @example
   * ```typescript
   * const service = new SaveAssessmentResultService(repository);
   * const abc = calculateAbc(stock, catchData, biologicalData);
   * await service.execute(stock, abc);
   * ```
   */
  async execute(
    stock: FisheryStock,
    result: AcceptableBiologicalCatch
  ): Promise<void> {
    logger.debug("execute called", { stockName: stock.name, resultValue: result.value });

    try {
      await this.repository.save(stock.name, result);
      logger.debug("execute completed", { stockName: stock.name });
    } catch (error) {
      logger.error("execute failed", { stockName: stock.name }, error as Error);
      throw error;
    }
  }
}

/**
 * @module save-ABC算定ment-result
 * 資源評価結果保存サービス
 */

import { AssessmentResultRepository, ABC算定結果 } from "@/domain";
import { 資源評価 } from "@/domain/models";
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
   * const abc = ABC算定(stock, catchData, biologicalData);
   * await service.execute(stock, abc);
   * ```
   */
  async execute(stock: 資源評価, result: ABC算定結果): Promise<void> {
    logger.debug("execute called", { stockName: stock.対象, resultValue: result.value });

    try {
      await this.repository.save(stock.対象.toString(), result);
      logger.debug("execute completed", { stockName: stock.対象 });
    } catch (error) {
      logger.error("execute failed", { stockName: stock.対象 }, error as Error);
      throw error;
    }
  }
}

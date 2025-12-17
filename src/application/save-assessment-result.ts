/**
 * @module save-ABC算定ment-result
 * 資源評価結果保存サービス
 */

import { AssessmentResultRepository, ABC算定結果 } from "@/domain";
import type { 進行中資源評価, 再検討中資源評価 } from "@/domain/models/stock/status";
import { logger } from "@/utils/logger";

/**
 * 評価結果を保存できるステータスの資源評価
 * - 作業中（進行中資源評価）
 * - 再検討中（再検討中資源評価）
 */
type 保存可能資源評価 = 進行中資源評価 | 再検討中資源評価;

/**
 * 資源評価結果保存サービス
 *
 * 水産資源の評価結果をリポジトリに保存する。
 * 「作業中」または「再検討中」ステータスの資源評価のみ受け付ける。
 */
export class SaveAssessmentResultService {
  /**
   * @param repository - 評価結果リポジトリ
   */
  constructor(private repository: AssessmentResultRepository) {}

  /**
   * 評価結果を保存する
   *
   * @param stock - 評価対象の水産資源（「作業中」または「再検討中」のみ）
   * @param result - 保存する評価結果（ABC）
   *
   * @example
   * ```typescript
   * const service = new SaveAssessmentResultService(repository);
   * const abc = ABC算定(stock, catchData, biologicalData);
   * await service.execute(stock, abc); // stock must be 進行中 or 再検討中
   * ```
   */
  async execute(stock: 保存可能資源評価, result: ABC算定結果): Promise<void> {
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

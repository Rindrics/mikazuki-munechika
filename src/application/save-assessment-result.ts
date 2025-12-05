import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";
import { logger } from "@/utils/logger";

export class SaveAssessmentResultService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stock: FisheryStock,
    result: AcceptableBiologicalCatch
  ): Promise<void> {
    logger.debug("execute called", { stockId: stock.id, resultValue: result.value });
    
    try {
      await this.repository.save(stock.id, result);
      logger.debug("execute completed", { stockId: stock.id });
    } catch (error) {
      logger.error("execute failed", { stockId: stock.id }, error as Error);
      throw error;
    }
  }
}

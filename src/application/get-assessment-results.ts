import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";
import { logger } from "@/utils/logger";

export class GetAssessmentResultsService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stocks: FisheryStock[]
  ): Promise<Array<{ stock: FisheryStock; result: AcceptableBiologicalCatch | undefined }>> {
    logger.debug("execute called", { stockCount: stocks.length });
    
    try {
      const results = await Promise.all(
        stocks.map(async (stock) => {
          const result = await this.repository.findByStockId(stock.id);
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

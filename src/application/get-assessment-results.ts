import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";
import { withLogger } from "@/utils/logger";

export class GetAssessmentResultsService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stocks: FisheryStock[]
  ): Promise<Array<{ stock: FisheryStock; result: AcceptableBiologicalCatch | undefined }>> {
    return await executeImpl(this.repository, stocks);
  }
}

const executeImpl = withLogger(
  "get-assessment-results",
  async (
    repository: AssessmentResultRepository,
    stocks: FisheryStock[]
  ): Promise<Array<{ stock: FisheryStock; result: AcceptableBiologicalCatch | undefined }>> => {
    return await Promise.all(
      stocks.map(async (stock) => {
        const result = await repository.findByStockId(stock.id);
        return { stock, result };
      })
    );
  }
);

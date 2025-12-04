import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";

export class GetAssessmentResultsService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stocks: FisheryStock[]
  ): Promise<Array<{ stock: FisheryStock; result: AcceptableBiologicalCatch | undefined }>> {
    return await Promise.all(
      stocks.map(async (stock) => {
        const result = await this.repository.findByStockId(stock.id);
        return { stock, result };
      })
    );
  }
}

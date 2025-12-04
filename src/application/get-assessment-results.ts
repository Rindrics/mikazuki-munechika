import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";

export class GetAssessmentResultsService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stock: FisheryStock
  ): Promise<AcceptableBiologicalCatch> {
    const result = await this.repository.findByStockId(stock.id);
    if (!result) {
      throw new Error("Assessment result not found");
    }
    return result;
  }
}

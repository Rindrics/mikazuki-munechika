import {
  AssessmentResultRepository,
  FisheryStock,
  AcceptableBiologicalCatch,
} from "@/domain";

export class SaveAssessmentResultService {
  constructor(private repository: AssessmentResultRepository) {}

  async execute(
    stock: FisheryStock,
    result: AcceptableBiologicalCatch
  ): Promise<void> {
    await this.repository.save(stock.id, result);
  }
}

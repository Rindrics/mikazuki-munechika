import {
  AssessmentResultRepository,
  AcceptableBiologicalCatch,
} from "@/domain";

export class InMemoryAssessmentResultRepository
  implements AssessmentResultRepository
{
  private storage: Map<number, AcceptableBiologicalCatch> = new Map();

  async findByStockId(
    stockId: number
  ): Promise<AcceptableBiologicalCatch | undefined> {
    return this.storage.get(stockId);
  }

  async save(
    stockId: number,
    result: AcceptableBiologicalCatch
  ): Promise<void> {
    this.storage.set(stockId, result);
  }
}

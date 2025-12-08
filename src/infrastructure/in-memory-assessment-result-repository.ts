import { AssessmentResultRepository, AcceptableBiologicalCatch } from "@/domain";

export class InMemoryAssessmentResultRepository implements AssessmentResultRepository {
  private storage: Map<string, AcceptableBiologicalCatch> = new Map();

  async findByStockName(stockName: string): Promise<AcceptableBiologicalCatch | undefined> {
    return this.storage.get(stockName);
  }

  async save(stockName: string, result: AcceptableBiologicalCatch): Promise<void> {
    this.storage.set(stockName, result);
  }
}

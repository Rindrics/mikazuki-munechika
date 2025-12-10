import { AssessmentResultRepository, ABC算定結果 } from "@/domain";

export class InMemoryAssessmentResultRepository implements AssessmentResultRepository {
  private storage: Map<string, ABC算定結果> = new Map();

  async findByStockName(stockName: string): Promise<ABC算定結果 | undefined> {
    return this.storage.get(stockName);
  }

  async save(stockName: string, result: ABC算定結果): Promise<void> {
    this.storage.set(stockName, result);
  }
}

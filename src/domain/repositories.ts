import { AcceptableBiologicalCatch } from "./models";

export interface AssessmentResultRepository {
  findByStockId(stockId: number): Promise<AcceptableBiologicalCatch | undefined>;

  save(
    stockId: number,
    result: AcceptableBiologicalCatch
  ): Promise<void>;
}

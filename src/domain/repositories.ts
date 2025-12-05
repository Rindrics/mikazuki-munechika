import {
  AcceptableBiologicalCatch,
  User,
  StockGroupName,
} from "./models";

export interface AssessmentResultRepository {
  findByStockId(stockId: number): Promise<AcceptableBiologicalCatch | undefined>;

  save(
    stockId: number,
    result: AcceptableBiologicalCatch
  ): Promise<void>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  findByStockGroupName(stockGroupName: StockGroupName): Promise<User[]>;
}

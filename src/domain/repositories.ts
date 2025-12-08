import { User, AuthenticatedUser, StockGroupName } from "./models";
import { AcceptableBiologicalCatch } from "./data";

export interface AssessmentResultRepository {
  findByStockName(stockName: string): Promise<AcceptableBiologicalCatch | undefined>;

  save(
    stockName: string,
    result: AcceptableBiologicalCatch
  ): Promise<void>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  findByStockGroupName(stockGroupName: StockGroupName): Promise<User[]>;
  authenticate(email: string, password: string): Promise<AuthenticatedUser | null>;
  getCurrentUser(): Promise<AuthenticatedUser | null>;
  logout(): Promise<void>;
  onAuthStateChange(
    callback: (user: AuthenticatedUser | null) => void
  ): () => void;
}

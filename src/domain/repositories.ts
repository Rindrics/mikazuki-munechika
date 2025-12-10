import { ユーザー, 認証済ユーザー, 資源名 } from "./models";
import { ABC算定結果 } from "./data";

export interface AssessmentResultRepository {
  findByStockName(stockName: string): Promise<ABC算定結果 | undefined>;

  save(stockName: string, result: ABC算定結果): Promise<void>;
}

export interface ユーザーRepository {
  findByEmail(email: string): Promise<ユーザー | undefined>;
  findById(id: string): Promise<ユーザー | undefined>;
  findBy資源名(担当資源名: 資源名): Promise<ユーザー[]>;
  authenticate(email: string, password: string): Promise<認証済ユーザー | null>;
  getCurrentユーザー(): Promise<認証済ユーザー | null>;
  logout(): Promise<void>;
  onAuthStateChange(callback: (user: 認証済ユーザー | null) => void): () => void;
}

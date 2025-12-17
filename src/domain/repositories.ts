import { ユーザー, 認証済ユーザー, 資源名 } from "./models";
import type { 評価ステータス, 再検討前ステータス } from "./models/stock/status";
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

/**
 * Assessment status data for persistence
 */
export interface 資源評価ステータス {
  資源名: 資源名;
  年度: number;
  ステータス: 評価ステータス;
  元ステータス?: 再検討前ステータス;
}

/**
 * Repository for managing stock assessment status
 */
export interface 資源評価Repository {
  /**
   * Find assessment status by stock name and fiscal year
   */
  findBy資源名And年度(資源名: 資源名, 年度: number): Promise<資源評価ステータス | undefined>;

  /**
   * Find all assessments for a fiscal year
   */
  findBy年度(年度: number): Promise<資源評価ステータス[]>;

  /**
   * Save or update assessment status
   */
  save(assessment: 資源評価ステータス): Promise<void>;

  /**
   * Initialize assessments for a new fiscal year (all stocks start as "未着手")
   */
  initialize年度(年度: number): Promise<void>;
}

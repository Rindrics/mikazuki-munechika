import { ユーザー, 認証済ユーザー, 資源名 } from "./models";
import type { 評価ステータス, 再検討前ステータス } from "./models/stock/status";
import { ABC算定結果, 漁獲量データ, 生物学的データ } from "./data";

/**
 * Input parameters for assessment calculation (ADR 0018)
 */
export interface AssessmentParameters {
  catchData: 漁獲量データ;
  biologicalData: 生物学的データ;
}

/**
 * Versioned assessment result (ADR 0018)
 */
export interface VersionedAssessmentResult {
  version: number;
  fiscalYear: number;
  result: ABC算定結果;
  parameters?: AssessmentParameters;
  createdAt: Date;
}

export interface AssessmentResultRepository {
  /**
   * @deprecated Use findByStockNameAndFiscalYear instead
   */
  findByStockName(stockName: string): Promise<ABC算定結果 | undefined>;

  /**
   * Find all versions of assessment results for a stock and fiscal year
   */
  findByStockNameAndFiscalYear(
    stockName: string,
    fiscalYear: number
  ): Promise<VersionedAssessmentResult[]>;

  /**
   * Find a specific version of assessment result
   */
  findByStockNameAndVersion(
    stockName: string,
    fiscalYear: number,
    version: number
  ): Promise<VersionedAssessmentResult | undefined>;

  /**
   * Get the next version number for a stock and fiscal year
   */
  getNextVersion(stockName: string, fiscalYear: number): Promise<number>;

  /**
   * @deprecated Use saveWithVersion instead
   */
  save(stockName: string, result: ABC算定結果): Promise<void>;

  /**
   * Save a new version of assessment result (ADR 0018)
   * If parameters match an existing version, returns that version number (no new record)
   * Returns the version number assigned or found
   */
  saveWithVersion(
    stockName: string,
    fiscalYear: number,
    result: ABC算定結果,
    parameters: AssessmentParameters
  ): Promise<{ version: number; isNew: boolean }>;
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
  /**
   * Target version of assessment result for status changes (ADR 0018)
   * - 内部査読中: version under review (requested by primary assignee)
   * - 外部公開可能: version approved by secondary assignee
   * - 外部査読中: version published externally
   */
  承諾バージョン?: number;
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

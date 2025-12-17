import {
  AssessmentResultRepository,
  ABC算定結果,
  VersionedAssessmentResult,
  AssessmentParameters,
} from "@/domain";

interface StoredResult {
  version: number;
  fiscalYear: number;
  result: ABC算定結果;
  parameters?: AssessmentParameters;
  createdAt: Date;
}

export class InMemoryAssessmentResultRepository implements AssessmentResultRepository {
  // Key format: `${stockName}:${fiscalYear}:${version}`
  private versionedStorage: Map<string, StoredResult> = new Map();
  // Legacy storage for deprecated methods
  private legacyStorage: Map<string, ABC算定結果> = new Map();

  private makeKey(stockName: string, fiscalYear: number, version: number): string {
    return `${stockName}:${fiscalYear}:${version}`;
  }

  async findByStockName(stockName: string): Promise<ABC算定結果 | undefined> {
    return this.legacyStorage.get(stockName);
  }

  async findByStockNameAndFiscalYear(
    stockName: string,
    fiscalYear: number
  ): Promise<VersionedAssessmentResult[]> {
    const results: VersionedAssessmentResult[] = [];
    for (const [key, stored] of this.versionedStorage.entries()) {
      if (key.startsWith(`${stockName}:${fiscalYear}:`)) {
        results.push({
          version: stored.version,
          fiscalYear: stored.fiscalYear,
          result: stored.result,
          parameters: stored.parameters,
          createdAt: stored.createdAt,
        });
      }
    }
    // Sort by version descending
    return results.sort((a, b) => b.version - a.version);
  }

  async findByStockNameAndVersion(
    stockName: string,
    fiscalYear: number,
    version: number
  ): Promise<VersionedAssessmentResult | undefined> {
    const key = this.makeKey(stockName, fiscalYear, version);
    const stored = this.versionedStorage.get(key);
    if (!stored) return undefined;
    return {
      version: stored.version,
      fiscalYear: stored.fiscalYear,
      result: stored.result,
      parameters: stored.parameters,
      createdAt: stored.createdAt,
    };
  }

  async getNextVersion(stockName: string, fiscalYear: number): Promise<number> {
    let maxVersion = 0;
    for (const [key, stored] of this.versionedStorage.entries()) {
      if (key.startsWith(`${stockName}:${fiscalYear}:`)) {
        maxVersion = Math.max(maxVersion, stored.version);
      }
    }
    return maxVersion + 1;
  }

  async save(stockName: string, result: ABC算定結果): Promise<void> {
    this.legacyStorage.set(stockName, result);
  }

  /**
   * Find existing version with same parameters (for deduplication)
   */
  private findExistingVersionByParams(
    stockName: string,
    fiscalYear: number,
    parameters: AssessmentParameters
  ): number | null {
    const paramsJson = JSON.stringify(parameters);
    for (const [key, stored] of this.versionedStorage.entries()) {
      if (
        key.startsWith(`${stockName}:${fiscalYear}:`) &&
        stored.parameters &&
        JSON.stringify(stored.parameters) === paramsJson
      ) {
        return stored.version;
      }
    }
    return null;
  }

  async saveWithVersion(
    stockName: string,
    fiscalYear: number,
    result: ABC算定結果,
    parameters: AssessmentParameters
  ): Promise<{ version: number; isNew: boolean }> {
    // Check for existing version with same parameters (ADR 0018 - deduplication)
    const existingVersion = this.findExistingVersionByParams(stockName, fiscalYear, parameters);
    if (existingVersion !== null) {
      return { version: existingVersion, isNew: false };
    }

    // Create new version
    const nextVersion = await this.getNextVersion(stockName, fiscalYear);
    const key = this.makeKey(stockName, fiscalYear, nextVersion);
    this.versionedStorage.set(key, {
      version: nextVersion,
      fiscalYear,
      result,
      parameters,
      createdAt: new Date(),
    });
    return { version: nextVersion, isNew: true };
  }
}

import { describe, it, expect, vi } from "vitest";
import { SaveAssessmentResultService } from "./save-assessment-result";
import type { AssessmentResultRepository, ABC算定結果 } from "@/domain";
import type { 進行中資源評価 } from "@/domain/models/stock/status";

/**
 * In-memory implementation of AssessmentResultRepository for testing
 */
class InMemoryAssessmentResultRepository implements AssessmentResultRepository {
  private store = new Map<string, ABC算定結果>();

  async findByStockName(stockName: string): Promise<ABC算定結果 | undefined> {
    return this.store.get(stockName);
  }

  async save(stockName: string, result: ABC算定結果): Promise<void> {
    this.store.set(stockName, result);
  }

  // Test helper methods
  getAll(): Map<string, ABC算定結果> {
    return new Map(this.store);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("SaveAssessmentResultService", () => {
  // Create a mock stock with "作業中" status (required for saving)
  const createMockStock = (name: string): 進行中資源評価 => ({
    作業ステータス: "作業中",
    対象: {
      呼称: "マイワシ",
      系群名: "テスト系群",
      資源タイプ: 1,
      equals: vi.fn(),
      toString: () => name,
      toDisplayString: vi.fn(),
    },
    資源量: "",
    資源量推定: vi.fn(),
    ABC算定: vi.fn(),
  } as 進行中資源評価);

  describe("execute", () => {
    it("saves result to repository", async () => {
      const repository = new InMemoryAssessmentResultRepository();
      const service = new SaveAssessmentResultService(repository);
      const stock = createMockStock("マイワシ太平洋系群");
      const result: ABC算定結果 = { value: "ABC = 12345 tons" };

      await service.execute(stock, result);

      const saved = await repository.findByStockName("マイワシ太平洋系群");
      expect(saved).toEqual(result);
    });

    it("overwrites existing result for same stock", async () => {
      const repository = new InMemoryAssessmentResultRepository();
      const service = new SaveAssessmentResultService(repository);
      const stock = createMockStock("マイワシ太平洋系群");
      const result1: ABC算定結果 = { value: "ABC = 10000 tons" };
      const result2: ABC算定結果 = { value: "ABC = 20000 tons" };

      await service.execute(stock, result1);
      await service.execute(stock, result2);

      const saved = await repository.findByStockName("マイワシ太平洋系群");
      expect(saved).toEqual(result2);
    });

    it("saves results for different stocks independently", async () => {
      const repository = new InMemoryAssessmentResultRepository();
      const service = new SaveAssessmentResultService(repository);
      const stock1 = createMockStock("マイワシ太平洋系群");
      const stock2 = createMockStock("ズワイガニオホーツク海系群");
      const result1: ABC算定結果 = { value: "ABC = 10000 tons" };
      const result2: ABC算定結果 = { value: "ABC = 5000 tons" };

      await service.execute(stock1, result1);
      await service.execute(stock2, result2);

      expect(await repository.findByStockName("マイワシ太平洋系群")).toEqual(result1);
      expect(await repository.findByStockName("ズワイガニオホーツク海系群")).toEqual(result2);
    });

    it("throws error when repository fails", async () => {
      const failingRepository: AssessmentResultRepository = {
        findByStockName: vi.fn(),
        save: vi.fn().mockRejectedValue(new Error("Database connection failed")),
      };
      const service = new SaveAssessmentResultService(failingRepository);
      const stock = createMockStock("マイワシ太平洋系群");
      const result: ABC算定結果 = { value: "ABC = 12345 tons" };

      await expect(service.execute(stock, result)).rejects.toThrow("Database connection failed");
    });

    it("delegates save to repository with correct arguments", async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const repository: AssessmentResultRepository = {
        findByStockName: vi.fn(),
        save: mockSave,
      };
      const service = new SaveAssessmentResultService(repository);
      const stock = createMockStock("マイワシ太平洋系群");
      const result: ABC算定結果 = { value: "ABC = 12345 tons" };

      await service.execute(stock, result);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith("マイワシ太平洋系群", result);
    });
  });
});

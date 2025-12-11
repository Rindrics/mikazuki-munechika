import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAssessmentResultsService } from "./get-assessment-results";
import type { AssessmentResultRepository, 資源評価, ABC算定結果 } from "@/domain";

describe("GetAssessmentResultsService", () => {
  const createMockStock = (name: string): 資源評価 => ({
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
  });

  const createMockRepository = (
    findByStockName: AssessmentResultRepository["findByStockName"]
  ): AssessmentResultRepository => ({
    findByStockName,
    save: vi.fn(),
  });

  describe("execute", () => {
    it("retrieves results for multiple stocks from repository", async () => {
      const stock1 = createMockStock("マイワシ太平洋系群");
      const stock2 = createMockStock("ズワイガニオホーツク海系群");
      const result1: ABC算定結果 = { value: "ABC result 1" };
      const result2: ABC算定結果 = { value: "ABC result 2" };

      const mockFindByStockName = vi.fn().mockImplementation((stockName: string) => {
        if (stockName === "マイワシ太平洋系群") return Promise.resolve(result1);
        if (stockName === "ズワイガニオホーツク海系群") return Promise.resolve(result2);
        return Promise.resolve(undefined);
      });

      const repository = createMockRepository(mockFindByStockName);
      const service = new GetAssessmentResultsService(repository);

      const results = await service.execute([stock1, stock2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ stock: stock1, result: result1 });
      expect(results[1]).toEqual({ stock: stock2, result: result2 });
      expect(mockFindByStockName).toHaveBeenCalledTimes(2);
      expect(mockFindByStockName).toHaveBeenCalledWith("マイワシ太平洋系群");
      expect(mockFindByStockName).toHaveBeenCalledWith("ズワイガニオホーツク海系群");
    });

    it("returns undefined for stocks without results", async () => {
      const stock = createMockStock("存在しない系群");

      const mockFindByStockName = vi.fn().mockResolvedValue(undefined);
      const repository = createMockRepository(mockFindByStockName);
      const service = new GetAssessmentResultsService(repository);

      const results = await service.execute([stock]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ stock, result: undefined });
    });

    it("returns empty array for empty stocks input", async () => {
      const mockFindByStockName = vi.fn();
      const repository = createMockRepository(mockFindByStockName);
      const service = new GetAssessmentResultsService(repository);

      const results = await service.execute([]);

      expect(results).toHaveLength(0);
      expect(mockFindByStockName).not.toHaveBeenCalled();
    });

    it("throws error when repository fails", async () => {
      const stock = createMockStock("マイワシ太平洋系群");
      const error = new Error("Repository error");

      const mockFindByStockName = vi.fn().mockRejectedValue(error);
      const repository = createMockRepository(mockFindByStockName);
      const service = new GetAssessmentResultsService(repository);

      await expect(service.execute([stock])).rejects.toThrow("Repository error");
    });

    it("throws error when one of multiple repository calls fails", async () => {
      const stock1 = createMockStock("マイワシ太平洋系群");
      const stock2 = createMockStock("エラー系群");
      const result1: ABC算定結果 = { value: "ABC result 1" };
      const error = new Error("Partial failure");

      const mockFindByStockName = vi.fn().mockImplementation((stockName: string) => {
        if (stockName === "マイワシ太平洋系群") return Promise.resolve(result1);
        return Promise.reject(error);
      });

      const repository = createMockRepository(mockFindByStockName);
      const service = new GetAssessmentResultsService(repository);

      await expect(service.execute([stock1, stock2])).rejects.toThrow("Partial failure");
    });
  });
});

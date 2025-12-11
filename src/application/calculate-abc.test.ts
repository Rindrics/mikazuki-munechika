import { describe, it, expect, vi } from "vitest";
import { ABC算定 } from "./calculate-abc";
import type { 資源評価, ABC算定結果, 漁獲量データ, 生物学的データ } from "@/domain";

describe("ABC算定", () => {
  it("calls 資源量推定 and ABC算定 on the stock and returns the result", () => {
    const mockABC算定結果: ABC算定結果 = { value: "test ABC result" };

    const mockABC算定 = vi.fn().mockReturnValue(mockABC算定結果);

    // Create a mock stock that chains 資源量推定 -> ABC算定
    const stockAfter資源量推定: 資源評価 = {
      対象: {
        呼称: "マイワシ",
        系群名: "太平洋系群",
        資源タイプ: 1,
        equals: vi.fn(),
        toString: () => "マイワシ太平洋系群",
        toDisplayString: vi.fn(),
      },
      資源量: "estimated",
      資源量推定: vi.fn(),
      ABC算定: mockABC算定,
    };

    const mock資源量推定 = vi.fn().mockReturnValue(stockAfter資源量推定);

    const mockStock: 資源評価 = {
      対象: {
        呼称: "マイワシ",
        系群名: "太平洋系群",
        資源タイプ: 1,
        equals: vi.fn(),
        toString: () => "マイワシ太平洋系群",
        toDisplayString: vi.fn(),
      },
      資源量: "",
      資源量推定: mock資源量推定,
      ABC算定: vi.fn(),
    };

    const catchData: 漁獲量データ = { value: "100" };
    const biologicalData: 生物学的データ = { value: "200" };

    const result = ABC算定(mockStock, catchData, biologicalData);

    expect(mock資源量推定).toHaveBeenCalledWith(catchData, biologicalData);
    expect(mockABC算定).toHaveBeenCalled();
    expect(result).toEqual(mockABC算定結果);
  });

  it("returns the ABC算定結果 with correct value", () => {
    const expectedValue = "ABC = 12345 tons";
    const mockABC算定結果: ABC算定結果 = { value: expectedValue };

    const stockAfter資源量推定: 資源評価 = {
      対象: {
        呼称: "ズワイガニ",
        系群名: "オホーツク海系群",
        資源タイプ: 2,
        equals: vi.fn(),
        toString: () => "ズワイガニオホーツク海系群",
        toDisplayString: vi.fn(),
      },
      資源量: "estimated",
      資源量推定: vi.fn(),
      ABC算定: () => mockABC算定結果,
    };

    const mockStock: 資源評価 = {
      対象: {
        呼称: "ズワイガニ",
        系群名: "オホーツク海系群",
        資源タイプ: 2,
        equals: vi.fn(),
        toString: () => "ズワイガニオホーツク海系群",
        toDisplayString: vi.fn(),
      },
      資源量: "",
      資源量推定: () => stockAfter資源量推定,
      ABC算定: vi.fn(),
    };

    const result = ABC算定(mockStock, { value: "catch data" }, { value: "biological data" });

    expect(result.value).toBe(expectedValue);
  });
});

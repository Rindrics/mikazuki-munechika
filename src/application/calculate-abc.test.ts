import { describe, it, expect } from "vitest";
import { ABC算定 } from "./calculate-abc";
import { create資源情報, create資源評価, 資源名s } from "@/domain";
import type { 漁獲量データ, 生物学的データ } from "@/domain";

describe("ABC算定", () => {
  it("calls 資源量推定 and ABC算定 on the stock and returns the result", () => {
    // Create actual domain models using factory functions
    const 資源情報 = create資源情報(資源名s.マイワシ太平洋);
    const 資源評価 = create資源評価(資源情報);

    const catchData: 漁獲量データ = { value: "100" };
    const biologicalData: 生物学的データ = { value: "200" };

    const result = ABC算定(資源評価, catchData, biologicalData);

    expect(result).toBeDefined();
    expect(result.value).toContain("Simulated WITH recruitment");
  });

  it("returns the ABC算定結果 with correct value for Type 2 stock", () => {
    // Create Type 2 stock (ズワイガニ)
    const 資源情報 = create資源情報(資源名s.ズワイガニオホーツク);
    const 資源評価 = create資源評価(資源情報);

    const catchData: 漁獲量データ = { value: "catch data" };
    const biologicalData: 生物学的データ = { value: "biological data" };

    const result = ABC算定(資源評価, catchData, biologicalData);

    expect(result).toBeDefined();
    expect(result.value).toContain("Simulated WITHOUT recruitment");
  });

  it("returns the ABC算定結果 with correct value for Type 3 stock", () => {
    // Create Type 3 stock (マチ類)
    const 資源情報 = create資源情報(資源名s.マチ類);
    const 資源評価 = create資源評価(資源情報);

    const catchData: 漁獲量データ = { value: "catch data" };
    const biologicalData: 生物学的データ = { value: "biological data" };

    const result = ABC算定(資源評価, catchData, biologicalData);

    expect(result).toBeDefined();
    expect(result.value).toContain("ABC estimated DIRECTLY");
  });
});

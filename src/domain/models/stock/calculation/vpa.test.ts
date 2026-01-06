import { describe, it, expect } from "vitest";
import { calculateAbundanceFromCatch, runVPA, type VPAInput } from "./vpa";
import { create年齢年行列 } from "./strategy";

describe("VPA (Virtual Population Analysis)", () => {
  describe("calculateAbundanceFromCatch", () => {
    it("should calculate abundance using Pope approximation", () => {
      // Simple test case
      const catch_量 = 100; // 千尾
      const F = 0.5;
      const M = 0.4;

      const abundance = calculateAbundanceFromCatch(catch_量, F, M);

      // Expected calculation using Pope (1972) approximation:
      // 式(2): Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
      // exp(M/2) = exp(0.2) ≈ 1.2214
      // 1 - exp(-F) = 1 - exp(-0.5) ≈ 1 - 0.6065 = 0.3935
      // N = 100 * 1.2214 / 0.3935 ≈ 310.42

      expect(abundance).toBeCloseTo(310.42, 1);
    });

    it("should throw error for negative F", () => {
      expect(() => {
        calculateAbundanceFromCatch(100, -0.5, 0.4);
      }).toThrow("F must be positive");
    });

    it("should throw error for negative catch", () => {
      expect(() => {
        calculateAbundanceFromCatch(-100, 0.5, 0.4);
      }).toThrow("Catch must be non-negative");
    });

    it("should handle zero catch", () => {
      const abundance = calculateAbundanceFromCatch(0, 0.5, 0.4);
      expect(abundance).toBe(0);
    });
  });

  describe("runVPA", () => {
    it("should perform backward calculation for simple case", () => {
      // Simple test case: 2 years, 3 age classes
      const input: VPAInput = {
        年齢別漁獲尾数: create年齢年行列({
          単位: "千尾",
          年範囲: { 開始年: 2023, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 2 },
          データ: [
            [50, 80, 60], // 2023年: 年齢0, 1, 2
            [60, 90, 70], // 2024年: 年齢0, 1, 2
          ],
        }),
        年齢別体重: create年齢年行列({
          単位: "g",
          年範囲: { 開始年: 2023, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 2 },
          データ: [
            [20, 40, 60], // 2023年
            [25, 35, 70], // 2024年
          ],
        }),
        年齢別成熟割合: create年齢年行列({
          単位: "無次元",
          年範囲: { 開始年: 2023, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 2 },
          データ: [
            [0, 0.5, 1.0], // 2023年
            [0, 0.5, 1.0], // 2024年
          ],
        }),
        M: () => 0.4, // 固定値
        最近年の年齢別資源尾数: [100, 150, 120], // 2024年の資源尾数（年齢0, 1, 2）
      };

      const result = runVPA(input);

      // Basic checks
      expect(result.年齢別資源尾数.データ).toHaveLength(2); // 2 years
      expect(result.年齢別資源尾数.データ[0]).toHaveLength(3); // 3 ages
      expect(result.年齢別漁獲係数.データ).toHaveLength(2);
      expect(result.親魚量.データ).toHaveLength(2);
      expect(result.加入量.データ).toHaveLength(2);

      // Check that abundance is positive
      for (const yearData of result.年齢別資源尾数.データ) {
        for (const abundance of yearData) {
          expect(abundance).toBeGreaterThanOrEqual(0);
        }
      }

      // Check that F is non-negative
      for (const yearData of result.年齢別漁獲係数.データ) {
        for (const f of yearData) {
          expect(f).toBeGreaterThanOrEqual(0);
        }
      }

      // Check that SSB is calculated
      for (let yearIdx = 0; yearIdx < 2; yearIdx++) {
        const ssbSum = result.親魚量.データ[yearIdx].reduce((sum, val) => sum + val, 0);

        expect(ssbSum).toBeGreaterThan(0);
      }

      // Check recruitment (age 0 abundance)
      expect(result.加入量.データ[0][0]).toBeGreaterThan(0);
      expect(result.加入量.データ[1][0]).toBeGreaterThan(0);
    });

    it("should maintain matrix dimensions", () => {
      const input: VPAInput = {
        年齢別漁獲尾数: create年齢年行列({
          単位: "千尾",
          年範囲: { 開始年: 2020, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
          データ: Array(5)
            .fill(null)
            .map(() => [50, 80, 100, 90, 70, 60]),
        }),
        年齢別体重: create年齢年行列({
          単位: "g",
          年範囲: { 開始年: 2020, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
          データ: Array(5)
            .fill(null)
            .map(() => [20, 40, 70, 90, 110, 120]),
        }),
        年齢別成熟割合: create年齢年行列({
          単位: "無次元",
          年範囲: { 開始年: 2020, 終了年: 2024 },
          年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
          データ: Array(5)
            .fill(null)
            .map(() => [0, 0.2, 0.5, 0.8, 1.0, 1.0]),
        }),
        M: (age) => 0.4 + age * 0.01, // Age-dependent M
        最近年の年齢別資源尾数: [100, 150, 200, 180, 140, 120], // 2024年の資源尾数（年齢0-5）
      };

      const result = runVPA(input);

      expect(result.年齢別資源尾数.年範囲).toEqual({ 開始年: 2020, 終了年: 2024 });
      expect(result.年齢別資源尾数.年齢範囲).toEqual({ 最小年齢: 0, 最大年齢: 5 });
      expect(result.年齢別資源尾数.データ).toHaveLength(5);
      expect(result.年齢別資源尾数.データ[0]).toHaveLength(6);
    });
  });
});

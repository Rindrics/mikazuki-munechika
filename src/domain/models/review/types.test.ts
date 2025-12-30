/**
 * @module review/types.test
 * 査読用資源評価の型・ファクトリ関数のテスト
 */

import { describe, it, expect, vi } from "vitest";
import { create査読用資源評価 } from "./types";
import type { 査読用資源評価作成パラメータ } from "./types";
import type { 当年までの資源計算結果 } from "../stock/calculation/strategy";
import { create年齢年行列 } from "../stock/calculation/strategy";
import { 資源名s } from "@/domain/constants";

/**
 * Create mock 当年までの資源計算結果 for testing
 */
function createMock資源計算結果(): 当年までの資源計算結果 {
  const matrix千尾 = create年齢年行列({
    単位: "千尾",
    年範囲: { 開始年: 2020, 終了年: 2023 },
    年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
    データ: Array(4)
      .fill(null)
      .map(() => Array(6).fill(100)),
  });

  const matrixトン = create年齢年行列({
    単位: "トン",
    年範囲: { 開始年: 2020, 終了年: 2023 },
    年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
    データ: Array(4)
      .fill(null)
      .map(() => Array(6).fill(1000)),
  });

  return {
    最終年: 2023,
    親魚量: matrixトン,
    加入量: matrix千尾,
    __kind: "当年まで",
  } as 当年までの資源計算結果;
}

describe("create査読用資源評価", () => {
  it("should create 査読用資源評価 with all required fields", () => {
    const mockUUID = "test-uuid-1234";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      mockUUID as `${string}-${string}-${string}-${string}-${string}`
    );

    const params: 査読用資源評価作成パラメータ = {
      査読者ID: "reviewer-001",
      対象資源: 資源名s.マイワシ太平洋,
      評価年度: 2024,
      資源計算結果: createMock資源計算結果(),
    };

    const result = create査読用資源評価(params);

    expect(result.id).toBe(mockUUID);
    expect(result.査読者ID).toBe("reviewer-001");
    expect(result.対象資源).toBe(資源名s.マイワシ太平洋);
    expect(result.評価年度).toBe(2024);
    expect(result.資源計算結果).toBeDefined();
    expect(result.資源計算結果.最終年).toBe(2023);
  });

  it("should generate unique ID for each 査読用資源評価", () => {
    const params: 査読用資源評価作成パラメータ = {
      査読者ID: "reviewer-001",
      対象資源: 資源名s.マイワシ太平洋,
      評価年度: 2024,
      資源計算結果: createMock資源計算結果(),
    };

    // Restore original randomUUID for this test
    vi.restoreAllMocks();

    const result1 = create査読用資源評価(params);
    const result2 = create査読用資源評価(params);

    expect(result1.id).not.toBe(result2.id);
  });

  it("should preserve immutability of returned object", () => {
    const params: 査読用資源評価作成パラメータ = {
      査読者ID: "reviewer-001",
      対象資源: 資源名s.マイワシ太平洋,
      評価年度: 2024,
      資源計算結果: createMock資源計算結果(),
    };

    const result = create査読用資源評価(params);

    // Verify readonly fields are present
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("査読者ID");
    expect(result).toHaveProperty("対象資源");
    expect(result).toHaveProperty("評価年度");
    expect(result).toHaveProperty("資源計算結果");
  });
});

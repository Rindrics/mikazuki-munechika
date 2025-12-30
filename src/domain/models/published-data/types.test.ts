/**
 * @module published-data/types.test
 * 公開データセット型のテスト
 *
 * Note: This module contains only type definitions (interfaces),
 * so tests are limited to type-level assertions and documentation.
 */

import { describe, it, expect } from "vitest";
import type { 公開データセット, コホート解析結果, 将来予測結果 } from "./types";
import { create年齢年行列 } from "../stock/calculation/strategy";
import { 資源名s } from "@/domain/constants";

/**
 * Create a mock コホート解析結果 for testing
 */
function createMockコホート解析結果(): コホート解析結果 {
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

  const matrix無次元 = create年齢年行列({
    単位: "無次元",
    年範囲: { 開始年: 2020, 終了年: 2023 },
    年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
    データ: Array(4)
      .fill(null)
      .map(() => Array(6).fill(0.1)),
  });

  return {
    年齢別漁獲尾数: matrix千尾,
    年齢別漁獲量: matrixトン,
    年齢別漁獲係数: matrix無次元,
    年齢別資源尾数: matrix千尾,
    SPR: new Map([
      [2020, 20],
      [2021, 21],
      [2022, 22],
      [2023, 23],
    ]),
    F_Fmsy: new Map([
      [2020, 1.1],
      [2021, 1.2],
      [2022, 1.3],
      [2023, 1.4],
    ]),
  };
}

describe("公開データセット", () => {
  it("should be constructable with required fields", () => {
    const dataset: 公開データセット = {
      資源名: 資源名s.マイワシ太平洋,
      年度: 2024,
      コホート解析結果: createMockコホート解析結果(),
    };

    expect(dataset.資源名).toBe(資源名s.マイワシ太平洋);
    expect(dataset.年度).toBe(2024);
    expect(dataset.コホート解析結果).toBeDefined();
    expect(dataset.将来予測結果).toBeUndefined();
  });

  it("should allow optional 将来予測結果", () => {
    const dataset: 公開データセット = {
      資源名: 資源名s.マイワシ太平洋,
      年度: 2024,
      コホート解析結果: createMockコホート解析結果(),
      将来予測結果: {} as 将来予測結果,
    };

    expect(dataset.将来予測結果).toBeDefined();
  });
});

describe("コホート解析結果", () => {
  it("should contain all required matrices and maps", () => {
    const result = createMockコホート解析結果();

    // Verify 年齢年行列 fields
    expect(result.年齢別漁獲尾数.単位).toBe("千尾");
    expect(result.年齢別漁獲量.単位).toBe("トン");
    expect(result.年齢別漁獲係数.単位).toBe("無次元");
    expect(result.年齢別資源尾数.単位).toBe("千尾");

    // Verify year ranges
    expect(result.年齢別漁獲尾数.年範囲).toEqual({ 開始年: 2020, 終了年: 2023 });

    // Verify age ranges
    expect(result.年齢別漁獲尾数.年齢範囲).toEqual({ 最小年齢: 0, 最大年齢: 5 });

    // Verify Map fields
    expect(result.SPR.get(2020)).toBe(20);
    expect(result.F_Fmsy.get(2020)).toBeCloseTo(1.1);
  });

  it("should allow access to matrix data via get method", () => {
    const result = createMockコホート解析結果();

    // Access data for specific year and age
    expect(result.年齢別漁獲尾数.get(2020, 0, "千尾")).toBe(100);
    expect(result.年齢別漁獲量.get(2020, 0, "トン")).toBe(1000);
    expect(result.年齢別漁獲係数.get(2020, 0, "無次元")).toBeCloseTo(0.1);
  });
});

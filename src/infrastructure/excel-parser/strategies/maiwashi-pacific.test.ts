import { describe, it, expect } from "vitest";
import { マイワシ太平洋系群Strategy } from "./maiwashi-pacific";
import { join } from "path";
import { readFileSync } from "fs";
import { read } from "xlsx";
import { 資源名s } from "@/domain";

/**
 * Path to test fixtures
 */
const FIXTURES_DIR = join(__dirname, "../__fixtures__");
const FIXTURE_FILE = join(FIXTURES_DIR, "maiwashi-pacific-2024.xlsx");

/**
 * Load actual Excel file for testing
 */
function loadFixtureWorkbook() {
    const buffer = readFileSync(FIXTURE_FILE);
    return read(buffer, { type: "buffer" });
  }

describe("マイワシ太平洋系群Strategy", () => {
  describe("parse", () => {
    it("should parse actual Excel file successfully", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);

      expect(result.資源名).toBe(資源名s.マイワシ太平洋);
      expect(result.年度).toBe(2024);
      expect(result.コホート解析結果).toBeDefined();
    });
  });

  describe("コホート解析結果", () => {
    it("should correctly detect year range from actual data", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;

      // Year range should start from historical data
      expect(コホート解析結果.年齢別漁獲尾数.年範囲.開始年).toBe(1976);
      // Year range should end at recent year
      expect(コホート解析結果.年齢別漁獲尾数.年範囲.終了年).toBe(2023);
    });

    it("should correctly parse age range (0-5+)", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;

      // 5 = plus group (5+)
      expect(コホート解析結果.年齢別漁獲尾数.年齢範囲).toEqual({
        最小年齢: 0,
        最大年齢: 5,
      });
    });

    it("should have non-zero values for 年齢別漁獲尾数", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;
      const recentYear = コホート解析結果.年齢別漁獲尾数.年範囲.終了年;

      const value = コホート解析結果.年齢別漁獲尾数.get(recentYear, 0, "千尾");
      expect(value).toBeGreaterThan(0);
    });

    it("should have non-zero values for 年齢別資源尾数", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;
      const recentYear = コホート解析結果.年齢別資源尾数.年範囲.終了年;

      // 内部は千尾、百万尾で取得すると変換される
      const valueIn百万尾 = コホート解析結果.年齢別資源尾数.get(recentYear, 0, "百万尾");
      expect(valueIn百万尾).toBe(35_100);

      // 千尾でも取得できる
      const valueIn千尾 = コホート解析結果.年齢別資源尾数.get(recentYear, 0, "千尾");
      expect(valueIn千尾).toBe(35_100_000);
    });

    it("should parse 年齢別体重", () => {
        const workbook = loadFixtureWorkbook();
        const strategy = new マイワシ太平洋系群Strategy();
  
        const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
        const { コホート解析結果 } = result;
        const recentYear = コホート解析結果.年齢別体重.年範囲.終了年;

        expect(recentYear).toBe(2023); // 2024 年度の資源評価データを使っているので最終年は 2023 年
  
        const expectedWeights = [15, 40, 46, 60, 78, 94];
        [0, 1, 2, 3, 4, 5].forEach((age, index) => {
            const value = コホート解析結果.年齢別体重.get(recentYear, age, "g");
            expect(value).toBe(expectedWeights[index]);
        });
    });

    it("should parse 年齢別成熟割合", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;
      const recentYear = コホート解析結果.年齢別成熟割合.年範囲.終了年;

      const expectedMatureRatio = [0.0, 0.2, 1.0, 1.0, 1.0, 1.0];
      [0, 1, 2, 3, 4, 5].forEach((age, index) => {
        const value = コホート解析結果.年齢別成熟割合.get(recentYear, age, "無次元");
        expect(value).toBe(expectedMatureRatio[index]);
      });
    });

    it("should parse SPR as Map with values", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;

      expect(コホート解析結果.SPR).toBeInstanceOf(Map);
      expect(コホート解析結果.SPR.size).toBe(48);

      // Verify specific values
      expect(コホート解析結果.SPR.get(1976)).toBe(29.25);
      expect(コホート解析結果.SPR.get(2023)).toBe(21.13);
    });

    it("should parse F/Fmsy as Map with values", () => {
      const workbook = loadFixtureWorkbook();
      const strategy = new マイワシ太平洋系群Strategy();

      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;

      expect(コホート解析結果.F_Fmsy).toBeInstanceOf(Map);
      expect(コホート解析結果.F_Fmsy.size).toBe(48);

      // Verify specific values
      expect(コホート解析結果.F_Fmsy.get(1976)).toBe(1.74);
      expect(コホート解析結果.F_Fmsy.get(2023)).toBe(2.05);
    });
  });
});

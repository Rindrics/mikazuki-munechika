/**
 * @module infrastructure/excel-parser/parser.test
 * Excel パーサーのユニットテスト
 */

import { describe, it, expect } from "vitest";
import { PublishedDataExcelParser } from "./parser";
import { 資源名s } from "@/domain/constants";

/**
 * Mock workbook for testing
 * Simulates the structure returned by xlsx.read()
 */
function createMockWorkbook(options: {
  title?: string;
  sheetNames?: string[];
  sheets?: Record<string, Record<string, { v: unknown }>>;
}) {
  const {
    title = "令和6(2024)年度マイワシ太平洋系群の資源評価のデータセット",
    sheetNames = ["目次", "補足表2-1"],
    sheets = {},
  } = options;

  const defaultSheets: Record<string, Record<string, { v: unknown }>> = {
    目次: {
      A1: { v: title },
    },
    "補足表2-1": createCohortSheet(),
  };

  return {
    SheetNames: sheetNames,
    Sheets: { ...defaultSheets, ...sheets },
  };
}

/**
 * Create a minimal cohort analysis sheet for testing
 */
function createCohortSheet(): Record<string, { v: unknown }> {
  const sheet: Record<string, { v: unknown }> = {
    "!ref": "A1:E50",
  };

  // Header row with years (row 4, 0-indexed = row 3)
  sheet["B4"] = { v: 2020 };
  sheet["C4"] = { v: 2021 };
  sheet["D4"] = { v: 2022 };
  sheet["E4"] = { v: 2023 };

  // 年齢別漁獲尾数 (rows 5-10, ages 0-5)
  for (let age = 0; age <= 5; age++) {
    const row = 5 + age;
    sheet[`B${row}`] = { v: 100 + age }; // 2020
    sheet[`C${row}`] = { v: 110 + age }; // 2021
    sheet[`D${row}`] = { v: 120 + age }; // 2022
    sheet[`E${row}`] = { v: 130 + age }; // 2023
  }

  // 年齢別漁獲量 (rows 14-19)
  for (let age = 0; age <= 5; age++) {
    const row = 14 + age;
    sheet[`B${row}`] = { v: 10 + age };
    sheet[`C${row}`] = { v: 11 + age };
    sheet[`D${row}`] = { v: 12 + age };
    sheet[`E${row}`] = { v: 13 + age };
  }

  // 年齢別漁獲係数 F (rows 25-30)
  for (let age = 0; age <= 5; age++) {
    const row = 25 + age;
    sheet[`B${row}`] = { v: 0.1 + age * 0.01 };
    sheet[`C${row}`] = { v: 0.11 + age * 0.01 };
    sheet[`D${row}`] = { v: 0.12 + age * 0.01 };
    sheet[`E${row}`] = { v: 0.13 + age * 0.01 };
  }

  // SPR (row 33)
  sheet["B33"] = { v: 20 };
  sheet["C33"] = { v: 21 };
  sheet["D33"] = { v: 22 };
  sheet["E33"] = { v: 23 };

  // F/Fmsy (row 34)
  sheet["B34"] = { v: 1.1 };
  sheet["C34"] = { v: 1.2 };
  sheet["D34"] = { v: 1.3 };
  sheet["E34"] = { v: 1.4 };

  // 年齢別資源尾数 (rows 38-43)
  for (let age = 0; age <= 5; age++) {
    const row = 38 + age;
    sheet[`B${row}`] = { v: 1000 + age * 100 };
    sheet[`C${row}`] = { v: 1100 + age * 100 };
    sheet[`D${row}`] = { v: 1200 + age * 100 };
    sheet[`E${row}`] = { v: 1300 + age * 100 };
  }

  return sheet;
}

describe("PublishedDataExcelParser", () => {
  describe("detect資源名", () => {
    it("should detect マイワシ太平洋系群 from title", async () => {
      const parser = new PublishedDataExcelParser();
      const workbook = createMockWorkbook({
        title: "令和6(2024)年度マイワシ太平洋系群の資源評価のデータセット",
      });

      // Access private method via any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (parser as any).detect資源名(workbook);
      expect(result).toBe(資源名s.マイワシ太平洋);
    });

    it("should throw error when stock name cannot be detected", async () => {
      const parser = new PublishedDataExcelParser();
      const workbook = createMockWorkbook({
        title: "Unknown Stock Data",
      });

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (parser as any).detect資源名(workbook);
      }).toThrow("資源名を検出できませんでした");
    });
  });

  describe("getParseStrategy", () => {
    it("should return strategy for マイワシ太平洋系群", () => {
      const parser = new PublishedDataExcelParser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = (parser as any).getParseStrategy(資源名s.マイワシ太平洋);
      expect(strategy).toBeDefined();
    });

    it("should throw error for unsupported stock", () => {
      const parser = new PublishedDataExcelParser();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (parser as any).getParseStrategy("未対応の資源");
      }).toThrow("のパーサーは未実装です");
    });
  });
});

describe("マイワシ太平洋系群Strategy", () => {
  describe("parse", () => {
    it("should parse workbook and return 公開データセット", () => {
      const parser = new PublishedDataExcelParser();
      const workbook = createMockWorkbook({});

      // Get the strategy and test parse directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = (parser as any).getParseStrategy(資源名s.マイワシ太平洋);
      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);

      expect(result.資源名).toBe(資源名s.マイワシ太平洋);
      expect(result.年度).toBe(2024);
      expect(result.コホート解析結果).toBeDefined();
    });

    it("should correctly extract 年度 from title", () => {
      const parser = new PublishedDataExcelParser();

      // Test 令和 format
      const workbook1 = createMockWorkbook({
        title: "令和6(2024)年度マイワシ太平洋系群",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = (parser as any).getParseStrategy(資源名s.マイワシ太平洋);
      const result1 = strategy.parse(workbook1, 資源名s.マイワシ太平洋);
      expect(result1.年度).toBe(2024);

      // Test direct year format
      const workbook2 = createMockWorkbook({
        title: "2023年度マイワシ太平洋系群",
      });
      const result2 = strategy.parse(workbook2, 資源名s.マイワシ太平洋);
      expect(result2.年度).toBe(2023);
    });

    it("should throw error when cohort sheet is missing", () => {
      const parser = new PublishedDataExcelParser();
      const workbook = createMockWorkbook({
        sheetNames: ["目次"],
        sheets: {
          目次: {
            A1: { v: "令和6(2024)年度マイワシ太平洋系群" },
          },
        },
      });
      // Remove the default cohort sheet
      delete workbook.Sheets["補足表2-1"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = (parser as any).getParseStrategy(資源名s.マイワシ太平洋);

      expect(() => {
        strategy.parse(workbook, 資源名s.マイワシ太平洋);
      }).toThrow('シート "補足表2-1" が見つかりません');
    });
  });

  describe("parseコホート解析結果", () => {
    it("should parse age-year matrices with correct unit conversion", () => {
      const parser = new PublishedDataExcelParser();
      const workbook = createMockWorkbook({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strategy = (parser as any).getParseStrategy(資源名s.マイワシ太平洋);
      const result = strategy.parse(workbook, 資源名s.マイワシ太平洋);
      const { コホート解析結果 } = result;

      // Verify year range
      expect(コホート解析結果.年齢別漁獲尾数.年範囲).toEqual({
        開始年: 2020,
        終了年: 2023,
      });

      // Verify age range
      expect(コホート解析結果.年齢別漁獲尾数.年齢範囲).toEqual({
        最小年齢: 0,
        最大年齢: 5,
      });

      // Verify unit conversion: 百万尾 → 千尾 (×1000)
      // Original value: 100 → converted: 100000
      expect(コホート解析結果.年齢別漁獲尾数.get(2020, 0)).toBe(100000);

      // Verify 年齢別漁獲量 unit: 千トン → トン (×1000)
      // Original value: 10 → converted: 10000
      expect(コホート解析結果.年齢別漁獲量.get(2020, 0)).toBe(10000);

      // Verify 年齢別漁獲係数 (no conversion)
      expect(コホート解析結果.年齢別漁獲係数.get(2020, 0)).toBeCloseTo(0.1);

      // Verify SPR
      expect(コホート解析結果.SPR.get(2020)).toBe(20);
      expect(コホート解析結果.SPR.get(2023)).toBe(23);

      // Verify F/Fmsy
      expect(コホート解析結果.F_Fmsy.get(2020)).toBeCloseTo(1.1);
      expect(コホート解析結果.F_Fmsy.get(2023)).toBeCloseTo(1.4);
    });
  });
});


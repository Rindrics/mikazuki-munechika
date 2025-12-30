/**
 * table-detector.ts のテスト
 *
 * 実際の Excel ファイルを使用してテストを行う
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import {
  detectTables,
  detectColumnMapping,
  getCellValue,
  getDataRows,
  getHeaderRow,
  type DetectTablesOptions,
  type DetectedTable,
} from "./table-detector";

/**
 * テスト用の Excel ファイルを読み込む
 */
function loadFixtureWorkbook(): XLSX.WorkBook {
  const fixturePath = path.join(__dirname, "__fixtures__", "maiwashi-pacific-2024.xlsx");
  const buffer = fs.readFileSync(fixturePath);
  return XLSX.read(buffer, { type: "buffer" });
}

describe("table-detector", () => {
  let workbook: XLSX.WorkBook;
  let sheet: XLSX.WorkSheet;
  let tables: DetectedTable[];

  const options: DetectTablesOptions = {
    isTableTitle: (v) => !!v && v.startsWith("年齢別"),
    isHeaderRow: (v) => v === "年齢＼年" || v === "年齢\\年",
  };

  beforeAll(() => {
    workbook = loadFixtureWorkbook();
    // 補足表2-1 シートを取得
    const sheetName = workbook.SheetNames.find((name) => /補足表\d+-\d+/.test(name));
    if (!sheetName) {
      throw new Error("テスト用シートが見つかりません");
    }
    sheet = workbook.Sheets[sheetName];
    tables = detectTables(sheet, options);
  });

  describe("detectTables", () => {
    it("should detect all tables in the sheet", () => {
      // Should detect multiple tables
      expect(tables.length).toBeGreaterThanOrEqual(4);

      // Verify table titles
      const titles = tables.map((t) => t.title);
      expect(titles).toContain("年齢別漁獲尾数（百万尾）");
      expect(titles.some((t) => t.includes("年齢別漁獲量"))).toBe(true);
      expect(titles.some((t) => t.includes("年齢別漁獲係数"))).toBe(true);
      expect(titles.some((t) => t.includes("年齢別資源尾数"))).toBe(true);
    });

    it("should correctly identify 年齢別漁獲尾数 table structure", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");

      expect(table).toBeDefined();
      expect(table!.titleRow).toBe(3);
      expect(table!.headerRow).toBe(4);
      expect(table!.dataStartRow).toBe(5);
      // Data should include 0歳 through 5歳以上 (6 rows) + 計
      expect(table!.dataEndRow).toBeGreaterThanOrEqual(10);
    });

    it("should include all rows until empty row as data", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");

      expect(table).toBeDefined();
      // Data should include 0歳 through 5歳以上 (6 rows) + 計
      expect(table!.dataEndRow - table!.dataStartRow).toBeGreaterThanOrEqual(6);
    });

    it("should include %SPR and F/Fmsy as data rows", () => {
      const table = tables.find((t) => t.title.includes("年齢別漁獲係数"));

      expect(table).toBeDefined();
      // %SPR is at row 32, F/Fmsy at row 33
      expect(table!.dataEndRow).toBeGreaterThanOrEqual(33);
    });

    it("should include 2D data array", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");

      expect(table).toBeDefined();
      expect(table!.data).toBeDefined();
      expect(table!.data.length).toBeGreaterThan(0);

      // First row should be title
      expect(table!.data[0][0]).toBe("年齢別漁獲尾数（百万尾）");
    });
  });

  describe("getCellValue", () => {
    it("should return value from 2D data array", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      // First column of header row should be "年齢＼年"
      const headerValue = getCellValue(table!, 0, table!.headerIndex);
      expect(headerValue).toBe("年齢＼年");
    });

    it("should return undefined for empty cell", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      // Title row should have empty cells after the first column
      const emptyValue = getCellValue(table!, 1, 0);
      expect(emptyValue).toBeUndefined();
    });

    it("should return age label from data rows", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      // First data row should be "0歳"
      const ageLabel = getCellValue(table!, 0, table!.dataStartIndex);
      expect(ageLabel).toBe("0歳");
    });
  });

  describe("getHeaderRow", () => {
    it("should return header row as array", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const header = getHeaderRow(table!);
      expect(header[0]).toBe("年齢＼年");
      // Second column should be a year (e.g., "1976")
      expect(header[1]).toMatch(/^\d{4}$/);
    });
  });

  describe("getDataRows", () => {
    it("should return data rows without title and header", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const dataRows = getDataRows(table!);
      expect(dataRows.length).toBeGreaterThan(0);

      // First data row should be "0歳"
      expect(dataRows[0][0]).toBe("0歳");
    });
  });

  describe("detectColumnMapping", () => {
    it("should detect year columns from header row", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const yearFilter = (v: string): number | null => {
        const numValue = parseInt(v, 10);
        if (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100) {
          return numValue;
        }
        return null;
      };

      const mapping = detectColumnMapping(table!, yearFilter);

      // Should detect multiple years
      expect(mapping.size).toBeGreaterThan(40);

      // Verify specific years exist
      expect(mapping.has(1976)).toBe(true);
      expect(mapping.has(2023)).toBe(true);
    });

    it("should map years to correct column indices", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const yearFilter = (v: string): number | null => {
        const numValue = parseInt(v, 10);
        if (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100) {
          return numValue;
        }
        return null;
      };

      const mapping = detectColumnMapping(table!, yearFilter);

      // 1976 should be in column B (index 1)
      expect(mapping.get(1976)).toBe(1);

      // Years should be consecutive
      const year1977Col = mapping.get(1977);
      expect(year1977Col).toBe(2);
    });

    it("should return empty map when no matches found", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const neverMatch = (_v: string): string | null => null;
      const mapping = detectColumnMapping(table!, neverMatch);

      expect(mapping.size).toBe(0);
    });
  });

  describe("integration: table detection matches actual data", () => {
    it("should be able to read data from detected table", () => {
      const table = tables.find((t) => t.title === "年齢別漁獲尾数（百万尾）");
      expect(table).toBeDefined();

      const yearFilter = (v: string): number | null => {
        const numValue = parseInt(v, 10);
        if (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100) {
          return numValue;
        }
        return null;
      };

      const yearColumns = detectColumnMapping(table!, yearFilter);
      const col1976 = yearColumns.get(1976);

      expect(col1976).toBeDefined();

      // Read the 0歳 value for 1976 from 2D array
      const dataRows = getDataRows(table!);
      const value = dataRows[0][col1976!];

      expect(value).toBeDefined();
      // Value should be a number string
      const numValue = parseFloat(value);
      expect(isNaN(numValue)).toBe(false);
      expect(numValue).toBeGreaterThan(0);
    });
  });
});

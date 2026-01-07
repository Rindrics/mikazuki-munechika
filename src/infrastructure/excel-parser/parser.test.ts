/**
 * @module infrastructure/excel-parser/parser.test
 * Excel パーサーのユニットテスト（実ファイルベース）
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { PublishedDataExcelParser } from "./parser";
import { 資源名s } from "@/domain/constants";

/**
 * Path to test fixtures
 */
const FIXTURES_DIR = join(__dirname, "__fixtures__");
const FIXTURE_FILE = join(FIXTURES_DIR, "maiwashi-pacific-2024.xlsx");

/**
 * Load actual Excel file for testing
 */
function loadFixtureWorkbook() {
  const buffer = readFileSync(FIXTURE_FILE);
  return XLSX.read(buffer, { type: "buffer" });
}

describe("PublishedDataExcelParser", () => {
  describe("detect資源名", () => {
    it("should detect マイワシ太平洋系群 from actual file", () => {
      const parser = new PublishedDataExcelParser();
      const workbook = loadFixtureWorkbook();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (parser as any).detect資源名(workbook);
      expect(result).toBe(資源名s.マイワシ太平洋);
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

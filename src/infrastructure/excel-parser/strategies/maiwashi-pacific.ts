/**
 * @module infrastructure/excel-parser/strategies/maiwashi-pacific
 * マイワシ太平洋系群の Excel パース Strategy
 *
 * @see ADR 0029 for design rationale
 */

import type { WorkBook, WorkSheet } from "xlsx";
import type { ParseStrategy } from "@/domain/models/published-data/strategy";
import type { 公開データセット, コホート解析結果 } from "@/domain/models/published-data/types";
import type { 資源名 } from "@/domain/models/stock/stock/model";
import { create年齢年行列 } from "@/domain/models/stock/calculation/strategy";

/**
 * マイワシ太平洋系群の Excel パース Strategy
 *
 * シート構成:
 * - 補足表2-1: コホート解析の詳細（年齢×年マトリックス）
 */
export class マイワシ太平洋系群Strategy implements ParseStrategy {
  // Sheet name for cohort analysis data
  private static readonly COHORT_SHEET_NAME = "補足表2-1";

  // Row indices in the sheet (0-based)
  private static readonly HEADER_ROW = 3; // Row with years

  parse(workbook: WorkBook, 資源名: 資源名): 公開データセット {
    const 年度 = this.extract年度(workbook);
    const コホート解析結果 = this.parseコホート解析結果(workbook);

    return {
      資源名,
      年度,
      コホート解析結果,
    };
  }

  /**
   * タイトルから年度を抽出
   *
   * 例: "令和6(2024)年度マイワシ太平洋系群..." → 2024
   */
  private extract年度(workbook: WorkBook): number {
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    const cellA1 = firstSheet["A1"];
    const titleText = cellA1?.v || "";

    // Match patterns like "令和6(2024)年度" or "2024年度"
    const match = titleText.match(/\((\d{4})\)年度|(\d{4})年度/);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }

    throw new Error(`年度を抽出できませんでした。タイトル: "${titleText}"`);
  }

  /**
   * 補足表2-1 からコホート解析結果をパース
   */
  private parseコホート解析結果(workbook: WorkBook): コホート解析結果 {
    const sheet = workbook.Sheets[マイワシ太平洋系群Strategy.COHORT_SHEET_NAME];

    if (!sheet) {
      throw new Error(
        `シート "${マイワシ太平洋系群Strategy.COHORT_SHEET_NAME}" が見つかりません。` +
          `存在するシート: ${workbook.SheetNames.join(", ")}`
      );
    }

    // Parse year range from header row
    const { 開始年, 終了年, yearColumns } = this.parseYearRange(sheet);

    // Age range is typically 0-5+ for マイワシ
    const 年齢範囲 = { 最小年齢: 0, 最大年齢: 5 };

    // Parse each data table
    // Note: Row positions may need adjustment based on actual Excel structure
    const 年齢別漁獲尾数 = this.parseAgeYearMatrix(
      sheet,
      yearColumns,
      5, // Start row for this table
      年齢範囲,
      1000 // Convert 百万尾 → 千尾
    );

    const 年齢別漁獲量 = this.parseAgeYearMatrix(
      sheet,
      yearColumns,
      14, // Start row for this table
      年齢範囲,
      1000 // Convert 千トン → トン
    );

    const 年齢別漁獲係数 = this.parseAgeYearMatrix(
      sheet,
      yearColumns,
      25, // Start row for this table
      年齢範囲,
      1 // No conversion
    );

    const 年齢別資源尾数 = this.parseAgeYearMatrix(
      sheet,
      yearColumns,
      37, // Start row for this table
      年齢範囲,
      1000 // Convert 百万尾 → 千尾
    );

    // Parse SPR and F/Fmsy (single row each)
    const SPR = this.parseSingleRowData(sheet, yearColumns, 33);
    const F_Fmsy = this.parseSingleRowData(sheet, yearColumns, 34);

    return {
      年齢別漁獲尾数: create年齢年行列({
        単位: "千尾",
        年範囲: { 開始年, 終了年 },
        年齢範囲,
        データ: 年齢別漁獲尾数,
      }),
      年齢別漁獲量: create年齢年行列({
        単位: "トン",
        年範囲: { 開始年, 終了年 },
        年齢範囲,
        データ: 年齢別漁獲量,
      }),
      年齢別漁獲係数: create年齢年行列({
        単位: "無次元",
        年範囲: { 開始年, 終了年 },
        年齢範囲,
        データ: 年齢別漁獲係数,
      }),
      年齢別資源尾数: create年齢年行列({
        単位: "千尾",
        年範囲: { 開始年, 終了年 },
        年齢範囲,
        データ: 年齢別資源尾数,
      }),
      SPR,
      F_Fmsy,
    };
  }

  /**
   * ヘッダー行から年の範囲と列位置を取得
   */
  private parseYearRange(sheet: WorkSheet): {
    開始年: number;
    終了年: number;
    yearColumns: Map<number, string>;
  } {
    const yearColumns = new Map<number, string>();
    let 開始年 = Infinity;
    let 終了年 = -Infinity;

    // Scan header row for year values (columns B onwards)
    const range = sheet["!ref"];
    if (!range) {
      throw new Error("シートの範囲を取得できませんでした");
    }

    // Parse range like "A1:Z100"
    const match = range.match(/([A-Z]+)\d+:([A-Z]+)\d+/);
    if (!match) {
      throw new Error(`範囲の形式が不正です: ${range}`);
    }

    const endCol = match[2];
    const endColIndex = this.colToIndex(endCol);

    // Scan columns B to end for years in header row
    for (let colIndex = 1; colIndex <= endColIndex; colIndex++) {
      const colName = this.indexToCol(colIndex);
      const cellRef = `${colName}${マイワシ太平洋系群Strategy.HEADER_ROW + 1}`;
      const cell = sheet[cellRef];

      if (cell && typeof cell.v === "number" && cell.v >= 1900 && cell.v <= 2100) {
        const year = cell.v;
        yearColumns.set(year, colName);
        開始年 = Math.min(開始年, year);
        終了年 = Math.max(終了年, year);
      }
    }

    if (yearColumns.size === 0) {
      throw new Error("年のヘッダーが見つかりませんでした");
    }

    return { 開始年, 終了年, yearColumns };
  }

  /**
   * 年齢×年のマトリックスデータをパース
   */
  private parseAgeYearMatrix(
    sheet: WorkSheet,
    yearColumns: Map<number, string>,
    startRow: number,
    年齢範囲: { 最小年齢: number; 最大年齢: number },
    multiplier: number
  ): number[][] {
    const years = Array.from(yearColumns.keys()).sort((a, b) => a - b);
    const data: number[][] = [];

    // For each year, read the column of age data
    for (const year of years) {
      const colName = yearColumns.get(year)!;
      const yearData: number[] = [];

      // Read each age row
      const numAges = 年齢範囲.最大年齢 - 年齢範囲.最小年齢 + 1;
      for (let ageOffset = 0; ageOffset < numAges; ageOffset++) {
        const rowNum = startRow + ageOffset;
        const cellRef = `${colName}${rowNum}`;
        const cell = sheet[cellRef];

        const value = cell?.v ?? 0;
        yearData.push(typeof value === "number" ? value * multiplier : 0);
      }

      data.push(yearData);
    }

    return data;
  }

  /**
   * 単一行のデータ（SPR, F/Fmsy など）をパース
   */
  private parseSingleRowData(
    sheet: WorkSheet,
    yearColumns: Map<number, string>,
    row: number
  ): Map<number, number> {
    const result = new Map<number, number>();

    for (const [year, colName] of yearColumns) {
      const cellRef = `${colName}${row}`;
      const cell = sheet[cellRef];

      if (cell && typeof cell.v === "number") {
        result.set(year, cell.v);
      }
    }

    return result;
  }

  /**
   * Column letter to index (A=0, B=1, ..., Z=25, AA=26, ...)
   */
  private colToIndex(col: string): number {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /**
   * Index to column letter (0=A, 1=B, ..., 25=Z, 26=AA, ...)
   */
  private indexToCol(index: number): string {
    let col = "";
    index++;
    while (index > 0) {
      const remainder = (index - 1) % 26;
      col = String.fromCharCode(65 + remainder) + col;
      index = Math.floor((index - 1) / 26);
    }
    return col;
  }
}

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
import { detectTables, type DetectedTable, type DetectTablesOptions } from "../table-detector";
import { parseMatrixData, parseRowByLabel } from "../table-parser";

// =============================================================================
// ドメイン固有の判定関数
// =============================================================================

/**
 * 表タイトルかどうかを判定する（マイワシ太平洋系群固有）
 */
const isTableTitle = (value: string | undefined): boolean => {
  if (!value) return false;
  return (
    value.startsWith("年齢別") || value.includes("年齢別漁獲係数") || value.includes("年齢別資源量")
  );
};

/**
 * ヘッダー行かどうかを判定する
 */
const isHeaderRow = (value: string | undefined): boolean => {
  if (!value) return false;
  return value === "年齢＼年" || value === "年齢\\年";
};

/**
 * 年フィルタ（1900-2100 の数値を年として扱う）
 */
const yearFilter = (value: string): number | null => {
  const numValue = parseInt(value, 10);
  if (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100) {
    return numValue;
  }
  return null;
};

/**
 * 年齢ラベルから年齢を抽出する
 */
const extractAge = (label: string): number | null => {
  const match = label.match(/^(\d)歳/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * テーブルタイプ（マイワシ太平洋系群固有）
 */
type TableType =
  | "年齢別漁獲尾数"
  | "年齢別漁獲量"
  | "年齢別漁獲係数"
  | "年齢別資源尾数"
  | "年齢別資源量"
  | "年齢別平均体重"
  | "unknown";

/**
 * 表タイトルから表タイプを判定する
 */
const getTableType = (title: string): TableType => {
  if (title.includes("年齢別漁獲尾数")) return "年齢別漁獲尾数";
  if (title.includes("年齢別漁獲量")) return "年齢別漁獲量";
  if (title.includes("年齢別漁獲係数")) return "年齢別漁獲係数";
  if (title.includes("年齢別資源尾数")) return "年齢別資源尾数";
  if (title.includes("年齢別資源量")) return "年齢別資源量";
  if (title.includes("年齢別平均体重")) return "年齢別平均体重";
  return "unknown";
};

// =============================================================================
// Strategy 実装
// =============================================================================

/**
 * マイワシ太平洋系群の Excel パース Strategy
 *
 * A 列を走査してテーブルを自動検出し、データを抽出する。
 */
export class マイワシ太平洋系群Strategy implements ParseStrategy {
  private readonly detectOptions: DetectTablesOptions = {
    isTableTitle,
    isHeaderRow,
    labelColumn: "A",
  };

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
   * コホート解析の詳細シートを検出して結果をパース
   */
  private parseコホート解析結果(workbook: WorkBook): コホート解析結果 {
    // Find the sheet containing cohort analysis data
    const sheet = this.findCohortAnalysisSheet(workbook);

    // Detect all tables in the sheet
    const tables = detectTables(sheet, this.detectOptions);

    // Find required tables by type
    const tableMap = this.mapTablesByType(tables);

    // Parse each table
    const 年齢別漁獲尾数Table = this.getRequiredTable(tableMap, "年齢別漁獲尾数");
    const 年齢別漁獲量Table = this.getRequiredTable(tableMap, "年齢別漁獲量");
    const 年齢別漁獲係数Table = this.getRequiredTable(tableMap, "年齢別漁獲係数");
    const 年齢別資源尾数Table = this.getRequiredTable(tableMap, "年齢別資源尾数");
    const 年齢別資源量Table = this.getRequiredTable(tableMap, "年齢別資源量");

    // Parse age-year matrices
    // Note: Excel uses 百万尾, we convert to 千尾
    const 年齢別漁獲尾数Data = parseMatrixData(
      年齢別漁獲尾数Table,
      yearFilter,
      extractAge,
      1000 // 百万尾 → 千尾
    );
    const 年齢別漁獲量Data = parseMatrixData(
      年齢別漁獲量Table,
      yearFilter,
      extractAge,
      1000 // 千トン → トン
    );
    const 年齢別漁獲係数Data = parseMatrixData(年齢別漁獲係数Table, yearFilter, extractAge, 1);
    const 年齢別資源尾数Data = parseMatrixData(
      年齢別資源尾数Table,
      yearFilter,
      extractAge,
      1000 // 百万尾 → 千尾
    );
    const 年齢別資源量Data = parseMatrixData(
      年齢別資源量Table,
      yearFilter,
      extractAge,
      1000 // 千トン → トン
    );

    // Parse SPR and F/Fmsy rows from 年齢別漁獲係数 table
    const SPR = parseRowByLabel(年齢別漁獲係数Table, "%SPR", yearFilter);
    const F_Fmsy = parseRowByLabel(年齢別漁獲係数Table, "F/Fmsy", yearFilter);

    // Validate and derive ranges from parsed data
    const { columns, rows } = 年齢別漁獲尾数Data;
    const bugReportUrl = "https://github.com/Rindrics/mikazuki-munechika/issues";

    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error(
        "データの読み取りに失敗しました（年データが見つかりません）。\n" +
          `この問題が続く場合は、バグ報告をお願いします: ${bugReportUrl}`
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        "データの読み取りに失敗しました（年齢データが見つかりません）。\n" +
          `この問題が続く場合は、バグ報告をお願いします: ${bugReportUrl}`
      );
    }

    const years = [...columns].sort((a, b) => a - b);
    const ages = [...rows].sort((a, b) => a - b);

    const 年範囲 = { 開始年: years[0], 終了年: years[years.length - 1] };
    const 年齢範囲 = { 最小年齢: ages[0], 最大年齢: ages[ages.length - 1] };
    const 最終年 = years[years.length - 1];

    // Derive 親魚量 (sum of 年齢別資源量 for each year)
    const 親魚量データ = this.derive親魚量(年齢別資源量Data.data, years);

    // Derive 加入量 (0-year-old from 年齢別資源尾数)
    const 加入量データ = this.derive加入量(年齢別資源尾数Data.data, ages);

    return {
      最終年,
      年齢別漁獲尾数: create年齢年行列({
        単位: "千尾",
        年範囲,
        年齢範囲,
        データ: 年齢別漁獲尾数Data.data,
      }),
      年齢別漁獲量: create年齢年行列({
        単位: "トン",
        年範囲,
        年齢範囲,
        データ: 年齢別漁獲量Data.data,
      }),
      年齢別漁獲係数: create年齢年行列({
        単位: "無次元",
        年範囲,
        年齢範囲,
        データ: 年齢別漁獲係数Data.data,
      }),
      年齢別資源尾数: create年齢年行列({
        単位: "千尾",
        年範囲,
        年齢範囲,
        データ: 年齢別資源尾数Data.data,
      }),
      年齢別資源量: create年齢年行列({
        単位: "トン",
        年範囲,
        年齢範囲,
        データ: 年齢別資源量Data.data,
      }),
      親魚量: create年齢年行列({
        単位: "トン",
        年範囲,
        年齢範囲: { 最小年齢: 0, 最大年齢: 0 }, // Single age per year
        データ: 親魚量データ.map((value) => [value]), // Transform to [[v0],[v1],...]
      }),
      加入量: create年齢年行列({
        単位: "千尾",
        年範囲,
        年齢範囲: { 最小年齢: 0, 最大年齢: 0 }, // Single age (0-year-old) per year
        データ: 加入量データ.map((value) => [value]), // Transform to [[v0],[v1],...]
      }),
      SPR,
      F_Fmsy,
    };
  }

  /**
   * 年齢別資源量から親魚量を計算（各年の合計）
   */
  private derive親魚量(data: number[][], years: number[]): number[] {
    // Sum all ages for each year
    // data is indexed as data[yearIndex][ageIndex]
    const result: number[] = [];

    for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
      const yearData = data[yearIdx] ?? [];
      const sum = yearData.reduce((acc, val) => acc + (val ?? 0), 0);
      result.push(sum);
    }

    return result;
  }

  /**
   * 年齢別資源尾数から加入量を計算（0歳の資源尾数）
   */
  private derive加入量(data: number[][], ages: number[]): number[] {
    // Find the age index for age 0
    const ageIndex = ages.indexOf(0);

    if (ageIndex === -1) {
      // If no 0-year-old, return array of zeros for each year
      return data.map(() => 0);
    }

    // Extract age-0 values across all years
    // data is indexed as data[yearIndex][ageIndex]
    return data.map((yearData) => yearData[ageIndex] ?? 0);
  }

  /**
   * コホート解析の詳細シートを検出する
   *
   * シート名に「コホート解析」を含むか、A1 セルにその文字列を含むシートを探す
   */
  private findCohortAnalysisSheet(workbook: WorkBook): WorkSheet {
    // First, try to find by sheet name pattern
    const cohortSheetName = workbook.SheetNames.find(
      (name) => name.includes("コホート解析") || /補足表\d+-\d+/.test(name)
    );

    if (cohortSheetName) {
      return workbook.Sheets[cohortSheetName];
    }

    // Fallback: check A1 cell content of each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const a1 = sheet["A1"];
      if (a1?.v && String(a1.v).includes("コホート解析")) {
        return sheet;
      }
    }

    throw new Error(
      `コホート解析のシートが見つかりません。存在するシート: ${workbook.SheetNames.join(", ")}`
    );
  }

  /**
   * テーブルをタイプ別にマップする
   */
  private mapTablesByType(tables: DetectedTable[]): Map<TableType, DetectedTable> {
    const map = new Map<TableType, DetectedTable>();

    for (const table of tables) {
      const type = getTableType(table.title);
      if (type !== "unknown") {
        map.set(type, table);
      }
    }

    return map;
  }

  /**
   * 必須テーブルを取得する（見つからない場合はエラー）
   */
  private getRequiredTable(
    tableMap: Map<TableType, DetectedTable>,
    type: TableType
  ): DetectedTable {
    const table = tableMap.get(type);
    if (!table) {
      throw new Error(`テーブル「${type}」が見つかりません`);
    }
    return table;
  }
}

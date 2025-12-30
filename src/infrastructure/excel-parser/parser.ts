/**
 * @module infrastructure/excel-parser/parser
 * 公開データ Excel ファイルのパーサー実装
 *
 * @see ADR 0029 for design rationale
 */

import type { 公開データセット } from "@/domain/models/published-data/types";
import type { ExcelParser, ParseStrategy } from "@/domain/models/published-data";
import type { 資源名 } from "@/domain/models/stock/stock/model";
import { 資源名s } from "@/domain/constants";
import { マイワシ太平洋系群Strategy } from "./strategies/maiwashi-pacific";

/**
 * 公開データ Excel パーサーの実装
 *
 * 1. Excel からタイトルを読み取り、資源名を検出
 * 2. 資源名に応じた Strategy を選択
 * 3. Strategy にパース処理を委譲
 */
export class PublishedDataExcelParser implements ExcelParser {
  private strategies: Map<資源名, ParseStrategy>;

  constructor() {
    this.strategies = new Map([
      [資源名s.マイワシ太平洋, new マイワシ太平洋系群Strategy()],
      // Add more strategies here as needed
    ]);
  }

  async parse(file: File): Promise<公開データセット> {
    const XLSX = await import("xlsx");

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 1. Detect stock name from Excel content
    const 資源名 = this.detect資源名(workbook);

    // 2. Get appropriate strategy
    const strategy = this.getParseStrategy(資源名);

    // 3. Parse with stock-specific logic
    return strategy.parse(workbook, 資源名);
  }

  /**
   * Excel のタイトルから資源名を検出する
   *
   * 例: "令和6(2024)年度マイワシ太平洋系群の資源評価のデータセット"
   *     → "マイワシ太平洋系群"
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detect資源名(workbook: any): 資源名 {
    // Try to find the title in the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    // Look for the title in cell A1 or A2
    const cellA1 = firstSheet["A1"];
    const cellA2 = firstSheet["A2"];
    const titleText = cellA1?.v || cellA2?.v || "";

    // Try to match known stock names
    for (const [_key, stockName] of Object.entries(資源名s)) {
      if (titleText.includes(stockName)) {
        return stockName as 資源名;
      }
    }

    throw new Error(
      `資源名を検出できませんでした。タイトル: "${titleText}"\n` +
        `対応している資源: ${Object.values(資源名s).join(", ")}`
    );
  }

  private getParseStrategy(資源名: 資源名): ParseStrategy {
    const strategy = this.strategies.get(資源名);

    if (!strategy) {
      throw new Error(
        `${資源名} のパーサーは未実装です。\n` +
          `対応している資源: ${Array.from(this.strategies.keys()).join(", ")}`
      );
    }

    return strategy;
  }
}

/**
 * ExcelParser のファクトリ関数
 */
export function createExcelParser(): ExcelParser {
  return new PublishedDataExcelParser();
}

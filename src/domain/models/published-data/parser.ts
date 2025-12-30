/**
 * @module published-data/parser
 * 公開データ Excel ファイルのパーサー インターフェース
 *
 * @see ADR 0029 for design rationale
 */

import type { 公開データセット } from "./types";

/**
 * Excel ファイルをパースして公開データセットを返すインターフェース
 *
 * 資源名はファイル内の文字列から自動検出される。
 *
 * @example
 * ```typescript
 * import { createExcelParser } from "@/infrastructure/excel-parser";
 *
 * const parser = createExcelParser();
 * const データ = await parser.parse(file);
 * ```
 */
export interface ExcelParser {
  /**
   * Excel ファイルをパースして公開データセットを返す
   *
   * @param file - アップロードされた Excel ファイル
   * @returns 公開データセット
   * @throws ValidationError ファイル形式が不正、または資源名が検出できない場合
   */
  parse(file: File): Promise<公開データセット>;
}

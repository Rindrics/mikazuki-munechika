/**
 * @module published-data/strategy
 * 資源固有のパース処理を行う Strategy インターフェース
 *
 * @see ADR 0029 for design rationale
 */

import type { 公開データセット } from "./types";
import type { 資源名 } from "../stock/stock/model";

/**
 * 資源固有の Excel パース処理を行う Strategy
 *
 * 資源ごとに Excel の形式が異なるため、Strategy パターンで吸収する。
 * PublishedDataExcelParser が資源名を検出した後、適切な Strategy に委譲する。
 */
export interface ParseStrategy {
  /**
   * Excel ワークブックをパースして公開データセットを返す
   *
   * @param workbook - パース済みの Excel ワークブック（xlsx ライブラリの型）
   * @param 資源名 - 検出された資源名
   * @returns 公開データセット
   * @throws ValidationError フォーマットが不正な場合
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse(workbook: any, 資源名: 資源名): 公開データセット;
}

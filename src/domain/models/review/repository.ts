/**
 * @module review/repository
 * 査読用資源評価リポジトリのインターフェース
 *
 * @see ADR 0030 for design rationale
 */

import type { 資源名 } from "../stock/stock/model";
import type { 査読用資源評価 } from "./types";

/**
 * 査読用資源評価リポジトリ
 *
 * 査読者ごとに独立した評価データを永続化する。
 * 公式の資源評価リポジトリとは完全に分離されている。
 */
export interface 査読用資源評価Repository {
  /**
   * 査読用資源評価を保存する
   *
   * @param 評価 - 保存する評価
   */
  save(評価: 査読用資源評価): Promise<void>;

  /**
   * 査読者の全評価を取得する
   *
   * @param 査読者ID - 査読者のユーザーID
   * @returns 査読者の評価一覧
   */
  findBy査読者ID(査読者ID: string): Promise<査読用資源評価[]>;

  /**
   * 特定の査読用資源評価を取得する
   *
   * @param 査読者ID - 査読者のユーザーID
   * @param 資源名 - 資源名
   * @param 年度 - 評価年度
   * @returns 該当する評価、存在しない場合は undefined
   */
  findBy査読者IDAndResource(
    査読者ID: string,
    資源名: 資源名,
    年度: number
  ): Promise<査読用資源評価 | undefined>;

  /**
   * ID で査読用資源評価を取得する
   *
   * @param id - 評価のID
   * @returns 該当する評価、存在しない場合は undefined
   */
  findById(id: string): Promise<査読用資源評価 | undefined>;

  /**
   * 査読用資源評価を削除する
   *
   * @param id - 削除する評価のID
   */
  delete(id: string): Promise<void>;

  /**
   * 査読者の全評価を削除する
   *
   * @param 査読者ID - 査読者のユーザーID
   */
  deleteBy査読者ID(査読者ID: string): Promise<void>;
}

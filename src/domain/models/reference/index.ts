import { 資源タイプ } from "../../constants";
import { 資源情報 } from "../stock";

/**
 * 文献情報
 *
 */
export interface 文献情報 {
  readonly 著者: string[];
  readonly 出版年: number;
  readonly タイトル: string;
  readonly 出版者?: string;
  readonly ページ開始?: number;
  readonly ページ終了?: number;
  readonly ページ数?: string;
  readonly 巻?: number;
  readonly 号?: number;
  readonly URL?: string;
  readonly DOI?: string;
  readonly メモ?: string;
  readonly タグ?: string[];
  readonly 関連する資源タイプ?: 資源タイプ[];
  readonly 関連する資源呼称?: 資源情報["呼称"][];
}

export interface 文献リスト {
  文献追加(文献: 文献情報): void;
  文献一覧(): readonly 文献情報[];
}

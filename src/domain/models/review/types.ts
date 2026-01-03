/**
 * @module review/types
 * 査読用資源評価の型定義
 *
 * @see ADR 0030 for design rationale
 */

import type { 資源名 } from "../stock/stock/model";
import type { 当年までの資源計算結果 } from "../stock/calculation/strategy";
import type { ABC算定結果 } from "@/domain/data";

/**
 * 査読用資源評価
 *
 * 査読者が公開データをアップロードして ABC を算定するための独立した評価環境。
 * 公式の資源評価とは完全に分離され、査読者ごとに独立したインスタンスを持つ。
 *
 * @see ADR 0030 for design rationale
 */
export interface 査読用資源評価 {
  readonly id: string;
  readonly 査読者ID: string;
  readonly 対象資源: 資源名;
  readonly 評価年度: number;
  readonly 資源計算結果: 当年までの資源計算結果;
  readonly ABC結果?: ABC算定結果;
  readonly ABCパラメータ?: {
    漁獲データ: string;
    生物学的データ: string;
  };
}

/**
 * 査読用資源評価を作るためのパラメータ
 */
export interface 査読用資源評価作成パラメータ {
  査読者ID: string;
  対象資源: 資源名;
  評価年度: number;
  資源計算結果: 当年までの資源計算結果;
  ABC結果?: ABC算定結果;
  ABCパラメータ?: {
    漁獲データ: string;
    生物学的データ: string;
  };
}

/**
 * 査読用資源評価を作成する
 */
export function create査読用資源評価(params: 査読用資源評価作成パラメータ): 査読用資源評価 {
  return {
    id: crypto.randomUUID(),
    査読者ID: params.査読者ID,
    対象資源: params.対象資源,
    評価年度: params.評価年度,
    資源計算結果: params.資源計算結果,
    ABC結果: params.ABC結果,
    ABCパラメータ: params.ABCパラメータ,
  };
}

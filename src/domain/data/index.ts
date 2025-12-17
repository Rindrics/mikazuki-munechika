import { 資源量 } from "../models/stock";

/**
 * 生物学的許容漁獲量（ABC: Acceptable Biological Catch）
 * 資源評価の結果として算出される、持続可能な漁獲量の上限値
 */
export interface ABC算定結果 {
  /** ABC の値 */
  value: string;
  /** 単位 */
  unit: "トン";
  /** 資源量 */
  資源量?: 資源量;
}

/**
 * 月別港別漁獲量データなど
 */
export interface 漁獲量データ {
  /** 漁獲データの値 */
  value: string;
}

/**
 * 資源評価に使用する年齢組成、成長率、自然死亡率などのデータ
 */
export interface 生物学的データ {
  /** 生物学的データの値 */
  value: string;
}

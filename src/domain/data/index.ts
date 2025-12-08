/**
 * 生物学的許容漁獲量（ABC: Acceptable Biological Catch）
 * 資源評価の結果として算出される、持続可能な漁獲量の上限値
 */
export interface AcceptableBiologicalCatch {
    /** ABC の値 */
    value: string;
  }
  
  /**
   * 漁獲データ
   * 資源評価に使用する漁獲量や漁獲努力量などのデータ
   */
  export interface CatchData {
    /** 漁獲データの値 */
    value: string;
  }
  
  /**
   * 生物学的データ
   * 資源評価に使用する年齢組成、成長率、自然死亡率などのデータ
   */
  export interface BiologicalData {
    /** 生物学的データの値 */
    value: string;
  }
  
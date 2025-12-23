import type { ABC算定結果, 資源量指標値データ } from "@/domain/data";
import type {
  コホート解析Strategy,
  コホート解析入力,
  コホート解析用データ,
  前年までの資源計算結果,
  翌年資源計算結果,
  再生産関係残差,
  F,
  将来予測結果,
  漁獲管理規則,
  調整係数β,
  M,
} from "./strategy";
import { create年齢年行列, 固定値 } from "./strategy";
import { logger } from "@/utils/logger";

/**
 * コホート解析 Strategy のダミー実装
 *
 * 各メソッドを通過したことがわかるようにログを残す。
 * 実際の計算ロジックは後で実装する。
 */
export function createコホート解析Strategy(): コホート解析Strategy {
  const logs: string[] = [];

  logger.info("コホート解析Strategy を作成しました");

  return {
    手法名: "コホート解析",

    一次処理(入力: コホート解析入力): コホート解析用データ {
      logger.info("一次処理を開始します", { 漁獲量: 入力.漁獲量.value });
      logger.debug("一次処理の入力", {
        漁獲量: 入力.漁獲量.value,
        生物データ: 入力.生物データ.value,
      });

      const log = `[一次処理] 漁獲量=${入力.漁獲量.value}, 生物データ=${入力.生物データ.value}`;
      logs.push(log);

      // Create dummy matrices for cohort analysis input
      const 漁獲量行列 = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年: 2020, 終了年: 2024 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
        データ: Array(5)
          .fill(null)
          .map(() => Array(6).fill(100)),
      });

      const 体重行列 = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年: 2020, 終了年: 2024 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
        データ: Array(5)
          .fill(null)
          .map(() => Array(6).fill(0.5)),
      });

      const 成熟率行列 = create年齢年行列({
        単位: "無次元",
        年範囲: { 開始年: 2020, 終了年: 2024 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
        データ: Array(5)
          .fill(null)
          .map(() => [0, 0.2, 0.5, 0.8, 1.0, 1.0]),
      });

      logger.debug("一次処理のダミー行列を作成しました", {
        年範囲: { 開始年: 2020, 終了年: 2024 },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      });

      logger.info("一次処理が完了しました");

      return {
        漁獲量行列,
        体重行列,
        成熟率行列,
        M: 入力.M ?? (() => 固定値(0.4)),
      };
    },

    前年までのコホート解析(
      データ: コホート解析用データ,
      M: M,
      資源量指標値: 資源量指標値データ,
    ): 前年までの資源計算結果 {
      logger.info("前年までのコホート解析を開始します");
      logger.debug("前年までのコホート解析の入力", {
        漁獲量行列年範囲: データ.漁獲量行列.年範囲,
        年齢範囲: データ.漁獲量行列.年齢範囲,
        M: M(0).平均値,
        資源量指標値: 資源量指標値.value,
      });

      const log = `[前年までのコホート解析] 年範囲=${データ.漁獲量行列.年範囲.開始年}-${データ.漁獲量行列.年範囲.終了年}`;
      logs.push(log);

      // Create dummy result matrices (VPA output)
      const dummyMatrix千尾 = create年齢年行列({
        単位: "千尾",
        年範囲: データ.漁獲量行列.年範囲,
        年齢範囲: データ.漁獲量行列.年齢範囲,
        データ: Array(5)
          .fill(null)
          .map(() => Array(6).fill(100)),
      });

      const dummyMatrixトン = create年齢年行列({
        単位: "トン",
        年範囲: データ.漁獲量行列.年範囲,
        年齢範囲: データ.漁獲量行列.年齢範囲,
        データ: Array(5)
          .fill(null)
          .map(() => Array(6).fill(1000)),
      });

      logger.info("前年までのコホート解析が完了しました", { 最終年: データ.漁獲量行列.年範囲.終了年 });

      return {
        最終年: データ.漁獲量行列.年範囲.終了年,
        年齢別資源尾数: dummyMatrix千尾,
        親魚量: dummyMatrixトン,
        加入量: dummyMatrix千尾,
        __kind: "前年まで",
      } as 前年までの資源計算結果;
    },

    前進計算(前年結果: 前年までの資源計算結果, 残差: 再生産関係残差): 翌年資源計算結果 {
      logger.info("前進計算を開始します", { 前年最終年: 前年結果.最終年 });
      logger.debug("前進計算の入力", {
        前年最終年: 前年結果.最終年,
        残差数: 残差.残差.length,
        残差サンプル: 残差.残差.slice(0, 3),
      });

      const log = `[前進計算] 前年最終年=${前年結果.最終年}, 残差数=${残差.残差.length}`;
      logs.push(log);

      // Extend the year range by 1
      const 翌年 = 前年結果.最終年 + 1;
      const 開始年 = 前年結果.年齢別資源尾数.年範囲.開始年;
      const 年数 = 翌年 - 開始年 + 1;

      const dummyMatrix千尾 = create年齢年行列({
        単位: "千尾",
        年範囲: { 開始年, 終了年: 翌年 },
        年齢範囲: 前年結果.年齢別資源尾数.年齢範囲,
        データ: Array(年数)
          .fill(null)
          .map(() => Array(6).fill(100)),
      });

      const dummyMatrixトン = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年, 終了年: 翌年 },
        年齢範囲: 前年結果.年齢別資源尾数.年齢範囲,
        データ: Array(年数)
          .fill(null)
          .map(() => Array(6).fill(1000)),
      });

      logger.info("前進計算が完了しました", { 翌年最終年: 翌年 });

      return {
        最終年: 翌年,
        年齢別資源尾数: dummyMatrix千尾,
        親魚量: dummyMatrixトン,
        加入量: dummyMatrix千尾,
        __kind: "翌年",
      } as 翌年資源計算結果;
    },

    将来予測(翌年結果: 翌年資源計算結果, F: F, 予測年数: number): 将来予測結果 {
      logger.info("将来予測を開始します", { 翌年最終年: 翌年結果.最終年, 予測年数 });
      logger.debug("将来予測の入力", {
        翌年最終年: 翌年結果.最終年,
        F: F.値,
        予測年数,
      });

      const log = `[将来予測] 翌年最終年=${翌年結果.最終年}, F=${F.値}, 予測年数=${予測年数}`;
      logs.push(log);

      const endYear = 翌年結果.最終年 + 予測年数;

      const dummyMatrixトン = create年齢年行列({
        単位: "トン",
        年範囲: { 開始年: 翌年結果.最終年, 終了年: endYear },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
        データ: Array(予測年数 + 1)
          .fill(null)
          .map(() => Array(6).fill(1000)),
      });

      const dummyMatrix千尾 = create年齢年行列({
        単位: "千尾",
        年範囲: { 開始年: 翌年結果.最終年, 終了年: endYear },
        年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
        データ: Array(予測年数 + 1)
          .fill(null)
          .map(() => Array(6).fill(100)),
      });

      logger.info("将来予測が完了しました", { 将来予測終了年: endYear });

      return {
        将来予測終了年: endYear,
        年別資源量: dummyMatrixトン,
        年別漁獲量: dummyMatrix千尾,
      };
    },

    ABC決定(予測結果: 将来予測結果, 規則: 漁獲管理規則, β: 調整係数β): ABC算定結果 {
      logger.info("ABC決定を開始します", { 将来予測終了年: 予測結果.将来予測終了年 });
      logger.debug("ABC決定の入力", {
        将来予測終了年: 予測結果.将来予測終了年,
        目標F: 規則.目標F,
        禁漁水準: 規則.禁漁水準,
        限界管理基準値: 規則.限界管理基準値,
        目標管理基準値: 規則.目標管理基準値,
        β: β.値,
      });

      const log = `[ABC決定] 将来予測終了年=${予測結果.将来予測終了年}, 目標F=${規則.目標F}, β=${β.値}`;
      logs.push(log);

      // Return a result that shows the processing path
      const processPath = logs.join(" → ");

      logger.info("ABC決定が完了しました");
      logger.debug("ABC算定結果", { processPath });

      return {
        value: `ABC calculated via: ${processPath}`,
        unit: "トン",
        資源量: { 値: "dummy", 単位: "トン" },
      };
    },

    算定(入力: コホート解析入力): ABC算定結果 {
      logger.info("コホート解析による ABC 算定を開始します");

      // Dummy parameters for demonstration
      const 再生産関係の残差: 再生産関係残差 = { 残差: [0.1, -0.1, 0.05] };
      const 翌年のF: F = { 値: 0.5 };
      const 将来予測年数 = 10;
      const 漁獲管理規則: 漁獲管理規則 = {
        目標F: 0.5,
        禁漁水準: 0.1,
        限界管理基準値: 0.2,
        目標管理基準値: 0.3,
      };
      const β: 調整係数β = { 値: 0.8 };

      // Full pipeline
      const コホート解析用データ = this.一次処理(入力);
      const 自然死亡係数: M = () => 固定値(0.4);
      const ダミー資源量指標値: 資源量指標値データ = { value: "dummy CPUE" };
      const 前年までの結果 = this.前年までのコホート解析(コホート解析用データ, 自然死亡係数, ダミー資源量指標値);
      const 翌年結果 = this.前進計算(前年までの結果, 再生産関係の残差);
      const 予測結果 = this.将来予測(翌年結果, 翌年のF, 将来予測年数);
      const result = this.ABC決定(予測結果, 漁獲管理規則, β);

      logger.info("コホート解析による ABC 算定が完了しました");

      return result;
    },
  };
}

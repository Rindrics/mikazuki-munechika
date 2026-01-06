import type { ABC算定結果, 資源量指標値データ } from "@/domain/data";
import { APP_VERSION } from "@/utils/version";
import type {
  コホート解析Strategy,
  コホート解析入力,
  コホート解析用データ,
  前年までの資源計算結果,
  当年までの資源計算結果,
  再生産関係残差,
  F,
  将来予測結果,
  漁獲管理規則,
  調整係数β,
  M,
  CalculationParameters,
  ExecutablePipelineStep,
  PipelineContext,
} from "./strategy";
import { create年齢年行列, 固定値, generateMermaidFlowchart } from "./strategy";
import { logger } from "@/utils/logger";
import { runVPA, type VPAInput } from "./vpa";
import {
  runチューニングVPA,
  calculateターミナル資源尾数,
  type チューニングVPA入力,
  type 資源量指標値,
  type ターミナルF as チューニングターミナルF,
} from "./tuning-vpa";

/**
 * Default calculation parameters
 *
 * These are used when no parameters are provided to the 算定 method.
 * Users can override specific parameters from the UI.
 */
const defaultParameters: Required<CalculationParameters> = {
  M: () => 固定値(0.4),
  資源量指標値: { value: "default CPUE" },
  再生産関係残差: { 残差: [0.1, -0.1, 0.05] },
  当年のF: { 値: 0.5 },
  将来予測年数: 10,
  漁獲管理規則: {
    目標F: 0.5,
    禁漁水準: 0.1,
    限界管理基準値: 0.2,
    目標管理基準値: 0.3,
  },
  調整係数β: { 値: 0.8 },
};

/**
 * Check if value is a plain object (not array, null, or function)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value !== "function"
  );
}

/**
 * Deep merge two objects, preserving nested defaults
 *
 * - Does not mutate original objects
 * - Recursively merges nested plain objects
 * - Override values take precedence over defaults
 * - Functions and arrays are not recursively merged (replaced entirely)
 */
function deepMergeImpl(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...defaults };

  for (const key of Object.keys(overrides)) {
    const defaultValue = defaults[key];
    const overrideValue = overrides[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
      // Recursively merge nested objects
      result[key] = deepMergeImpl(defaultValue, overrideValue);
    } else {
      // Replace primitive values, arrays, and functions
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Deep merge CalculationParameters with defaults
 */
function deepMerge(
  defaults: Required<CalculationParameters>,
  overrides?: CalculationParameters
): Required<CalculationParameters> {
  if (!overrides) {
    return { ...defaults };
  }
  return deepMergeImpl(
    defaults as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>
  ) as Required<CalculationParameters>;
}

/**
 * コホート解析 Strategy のダミー実装
 *
 * 各メソッドを通過したことがわかるようにログを残す。
 * 実際の計算ロジックは後で実装する。
 *
 * @see ADR 0027 for pipeline pattern design
 */
export function createコホート解析Strategy(): コホート解析Strategy {
  const logs: string[] = [];

  // Define individual step implementations first
  const 一次処理 = (入力: コホート解析入力): コホート解析用データ => {
    logger.info("一次処理を開始します", { 漁獲量: 入力.漁獲量.value });
    logger.debug("一次処理の入力", {
      漁獲量: 入力.漁獲量.value,
      生物データ: 入力.生物データ.value,
    });

    const log = `[一次処理] 漁獲量=${入力.漁獲量.value}, 生物データ=${入力.生物データ.value}`;
    logs.push(log);

    // Create dummy matrices for cohort analysis input
    // マイワシ太平洋系群の実際のデータ期間 (1976-2023) に合わせる
    const 開始年 = 1976;
    const 終了年 = 2023;
    const 年数 = 終了年 - 開始年 + 1; // 48年

    const 漁獲尾数行列 = create年齢年行列({
      単位: "千尾",
      年範囲: { 開始年, 終了年 },
      年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      データ: Array(年数)
        .fill(null)
        .map(() => Array(6).fill(100)),
    });

    const 体重行列 = create年齢年行列({
      単位: "g",
      年範囲: { 開始年, 終了年 },
      年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      データ: Array(年数)
        .fill(null)
        .map(() => Array(6).fill(0.5)),
    });

    const 成熟割合行列 = create年齢年行列({
      単位: "無次元",
      年範囲: { 開始年, 終了年 },
      年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      データ: Array(年数)
        .fill(null)
        .map(() => [0, 0.2, 0.5, 0.8, 1.0, 1.0]),
    });

    logger.debug("一次処理のダミー行列を作成しました", {
      年範囲: { 開始年, 終了年 },
      年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      年数,
    });

    logger.info("一次処理が完了しました");

    return {
      漁獲尾数行列,
      体重行列,
      成熟割合行列,
      M: 入力.M ?? (() => 固定値(0.4)),
    };
  };

  const 前年までのコホート解析 = (
    データ: コホート解析用データ,
    M: M,
    資源量指標値: 資源量指標値データ | 資源量指標値[]
  ): 前年までの資源計算結果 => {
    logger.info("前年までのコホート解析を開始します");
    logger.debug("前年までのコホート解析の入力", {
      漁獲量行列年範囲: データ.漁獲尾数行列.年範囲,
      年齢範囲: データ.漁獲尾数行列.年齢範囲,
      M: M(0).平均値,
      資源量指標値: Array.isArray(資源量指標値)
        ? `${資源量指標値.length}個の指標値`
        : 資源量指標値.value,
    });

    const log = `[前年までのコホート解析] 年範囲=${データ.漁獲尾数行列.年範囲.開始年}-${データ.漁獲尾数行列.年範囲.終了年}`;
    logs.push(log);

    const 最終年Index = データ.漁獲尾数行列.データ.length - 1;
    const 最終年漁獲尾数 = データ.漁獲尾数行列.データ[最終年Index];
    const 最終年 = データ.漁獲尾数行列.年範囲.終了年;

    let 最近年の年齢別資源尾数: readonly number[];

    // 資源量指標値が配列形式（パース済み）の場合は、チューニングVPAを使用
    const useチューニングVPA = Array.isArray(資源量指標値) && 資源量指標値.length > 0;

    if (useチューニングVPA) {
      logger.info("チューニングVPAを使用してターミナルFを推定します");

      // Step 1: 初期VPAを実行して直近3年のFを取得
      logger.info("初期VPAを実行して直近3年のFを取得します");
      const 初期資源尾数 = 最終年漁獲尾数.map((catch_量, 年齢index) => {
        const M値 = M(年齢index).平均値;
        const assumedF = 0.4; // 初期推定値
        const numerator = catch_量 * Math.exp(M値 / 2);
        const denominator = 1 - Math.exp(-assumedF);
        return numerator / denominator;
      });

      const 初期VPA結果 = runVPA({
        年齢別漁獲尾数: データ.漁獲尾数行列,
        年齢別体重: データ.体重行列,
        年齢別成熟割合: データ.成熟割合行列,
        M: (年齢: number) => M(年齢).平均値,
        最近年の年齢別資源尾数: 初期資源尾数,
      });

      // Step 2: 直近3年のFを抽出（最終年の3年前から2年前まで）
      const データ年数 = 初期VPA結果.年齢別漁獲係数.データ.length;
      const 直近3年開始Index = Math.max(0, データ年数 - 4); // 最終年を除く直近3年
      const 直近3年F: number[][] = [];

      for (let i = 直近3年開始Index; i < データ年数 - 1 && i < 直近3年開始Index + 3; i++) {
        直近3年F.push([...初期VPA結果.年齢別漁獲係数.データ[i]]);
      }

      // 3年分のデータがない場合は最終年のFを複製
      while (直近3年F.length < 3) {
        const lastF =
          直近3年F.length > 0
            ? 直近3年F[直近3年F.length - 1]
            : 初期VPA結果.年齢別漁獲係数.データ[データ年数 - 2] ||
              初期VPA結果.年齢別漁獲係数.データ[データ年数 - 1];
        直近3年F.push([...lastF]);
      }

      logger.info("直近3年のFを抽出しました", {
        年数: 直近3年F.length,
        サンプル: 直近3年F[0]?.slice(0, 3),
      });

      // Step 3: チューニングVPAを実行
      const チューニング結果 = runチューニングVPA({
        資源量指標値: 資源量指標値 as 資源量指標値[],
        直近3年F,
        チューニング期間: {
          開始年: Math.max(2005, データ.漁獲尾数行列.年範囲.開始年),
          終了年: 最終年,
        },
        VPA入力データ: {
          年齢別漁獲尾数: データ.漁獲尾数行列,
          年齢別体重: データ.体重行列,
          年齢別成熟割合: データ.成熟割合行列,
          M: (年齢: number) => M(年齢).平均値,
        },
      });

      logger.info("チューニングVPAでターミナルFを推定しました", {
        F0: チューニング結果.ターミナルF.F0,
        F1: チューニング結果.ターミナルF.F1,
        F2: チューニング結果.ターミナルF.F2,
        F3: チューニング結果.ターミナルF.F3,
        F4: チューニング結果.ターミナルF.F4,
        最適λ: チューニング結果.最適λ,
      });

      // Step 4: チューニング結果から最近年の資源尾数を計算
      最近年の年齢別資源尾数 = calculateターミナル資源尾数(
        最終年漁獲尾数,
        チューニング結果.ターミナルF,
        (年齢: number) => M(年齢).平均値
      );

      logger.info("チューニングVPAによるターミナル資源尾数を計算しました", {
        資源尾数サンプル: 最近年の年齢別資源尾数.slice(0, 3),
      });
    } else {
      // 従来の方法: assumedF = 0.4 を使用
      logger.info("固定Fを使用してターミナル資源尾数を推定します（assumedF = 0.4）");

      // Estimate terminal year stock numbers assuming moderate exploitation (F ≈ 0.4)
      // Using Pope (1972) approximation
      最近年の年齢別資源尾数 = 最終年漁獲尾数.map((catch_量, 年齢index) => {
        const M値 = M(年齢index).平均値;
        const assumedF = 0.4; // Moderate exploitation assumption for dummy data

        // Pope approximation: Na,Y = Ca,Y exp(M/2) / (1 - exp(-Fa,Y))
        // This matches the formula used in vpa.ts (式2)
        const numerator = catch_量 * Math.exp(M値 / 2);
        const denominator = 1 - Math.exp(-assumedF);

        return numerator / denominator;
      });
    }

    // 基本VPAを実行
    const vpaInput: VPAInput = {
      年齢別漁獲尾数: データ.漁獲尾数行列,
      年齢別体重: データ.体重行列,
      年齢別成熟割合: データ.成熟割合行列,
      M: (年齢: number) => M(年齢).平均値,
      最近年の年齢別資源尾数,
    };

    const vpaResult = runVPA(vpaInput);

    logger.info("前年までのコホート解析が完了しました", {
      最終年,
    });

    return {
      最終年,
      年齢別資源尾数: vpaResult.年齢別資源尾数,
      親魚量: vpaResult.親魚量,
      加入量: vpaResult.加入量,
      __kind: "前年まで",
    } as 前年までの資源計算結果;
  };

  const 前進計算 = (
    前年結果: 前年までの資源計算結果,
    残差: 再生産関係残差
  ): 当年までの資源計算結果 => {
    logger.info("前進計算を開始します", { 前年最終年: 前年結果.最終年 });
    logger.debug("前進計算の入力", {
      前年最終年: 前年結果.最終年,
      残差数: 残差.残差.length,
      残差サンプル: 残差.残差.slice(0, 3),
    });

    const log = `[前進計算] 前年最終年=${前年結果.最終年}, 残差数=${残差.残差.length}`;
    logs.push(log);

    // Extend the year range by 1
    const 当年 = 前年結果.最終年 + 1;
    const 開始年 = 前年結果.年齢別資源尾数.年範囲.開始年;
    const 年数 = 当年 - 開始年 + 1;

    const dummyMatrix千尾 = create年齢年行列({
      単位: "千尾",
      年範囲: { 開始年, 終了年: 当年 },
      年齢範囲: 前年結果.年齢別資源尾数.年齢範囲,
      データ: Array(年数)
        .fill(null)
        .map(() => Array(6).fill(100)),
    });

    const dummyMatrixトン = create年齢年行列({
      単位: "トン",
      年範囲: { 開始年, 終了年: 当年 },
      年齢範囲: 前年結果.年齢別資源尾数.年齢範囲,
      データ: Array(年数)
        .fill(null)
        .map(() => Array(6).fill(1000)),
    });

    logger.info("前進計算が完了しました", { 当年最終年: 当年 });

    return {
      最終年: 当年,
      年齢別資源尾数: dummyMatrix千尾,
      親魚量: dummyMatrixトン,
      加入量: dummyMatrix千尾,
      __kind: "当年まで",
    } as 当年までの資源計算結果;
  };

  const 将来予測 = (当年結果: 当年までの資源計算結果, F: F, 予測年数: number): 将来予測結果 => {
    logger.info("将来予測を開始します", {
      当年最終年: 当年結果.最終年,
      予測年数,
    });
    logger.debug("将来予測の入力", {
      当年最終年: 当年結果.最終年,
      F: F.値,
      予測年数,
    });

    const log = `[将来予測] 当年最終年=${当年結果.最終年}, F=${F.値}, 予測年数=${予測年数}`;
    logs.push(log);

    const endYear = 当年結果.最終年 + 予測年数;

    const dummyMatrixトン = create年齢年行列({
      単位: "トン",
      年範囲: { 開始年: 当年結果.最終年, 終了年: endYear },
      年齢範囲: { 最小年齢: 0, 最大年齢: 5 },
      データ: Array(予測年数 + 1)
        .fill(null)
        .map(() => Array(6).fill(1000)),
    });

    const dummyMatrix千尾 = create年齢年行列({
      単位: "千尾",
      年範囲: { 開始年: 当年結果.最終年, 終了年: endYear },
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
  };

  const ABC決定 = (予測結果: 将来予測結果, 規則: 漁獲管理規則, β: 調整係数β): ABC算定結果 => {
    logger.info("ABC決定を開始します", {
      将来予測終了年: 予測結果.将来予測終了年,
    });
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
      appVersion: APP_VERSION,
    };
  };

  // Pipeline steps - SINGLE SOURCE OF TRUTH
  // Each step contains its execute function, ensuring no divergence
  const steps: ExecutablePipelineStep[] = [
    {
      methodName: "一次処理",
      inputNames: ["漁獲量データ", "生物学的データ"],
      outputName: "コホート解析用データ",
      execute: (ctx) => 一次処理(ctx.入力),
    },
    {
      methodName: "前年までのコホート解析",
      inputNames: ["コホート解析用データ", "M: 自然死亡係数", "資源量指標値"],
      outputName: "前年までの資源計算結果",
      execute: (ctx) =>
        前年までのコホート解析(
          ctx["コホート解析用データ"] as コホート解析用データ,
          ctx.params.M,
          ctx.params.資源量指標値
        ),
    },
    {
      methodName: "前進計算",
      inputNames: ["前年までの資源計算結果", "再生産関係残差"],
      outputName: "当年までの資源計算結果",
      execute: (ctx) =>
        前進計算(
          ctx["前年までの資源計算結果"] as 前年までの資源計算結果,
          ctx.params.再生産関係残差
        ),
    },
    {
      methodName: "将来予測",
      inputNames: ["当年までの資源計算結果", "当年のF", "将来予測年数"],
      outputName: "将来予測結果",
      execute: (ctx) =>
        将来予測(
          ctx["当年までの資源計算結果"] as 当年までの資源計算結果,
          ctx.params.当年のF,
          ctx.params.将来予測年数
        ),
    },
    {
      methodName: "ABC決定",
      inputNames: ["将来予測結果", "漁獲管理規則", "調整係数β"],
      outputName: "ABC算定結果",
      execute: (ctx) =>
        ABC決定(ctx["将来予測結果"] as 将来予測結果, ctx.params.漁獲管理規則, ctx.params.調整係数β),
    },
  ];

  logger.info("コホート解析Strategy を作成しました");

  return {
    手法名: "コホート解析",

    steps,

    generateFlowchart(): string {
      return generateMermaidFlowchart(steps);
    },

    一次処理,
    前年までのコホート解析,
    前進計算,
    将来予測,
    ABC決定,

    算定(入力: コホート解析入力, params?: CalculationParameters): ABC算定結果 {
      logger.info("コホート解析による ABC 算定を開始します");

      // Deep merge user parameters with defaults (preserves nested fields)
      const p = deepMerge(defaultParameters, params);
      logger.debug("使用するパラメータ", {
        M平均値: p.M(0).平均値,
        将来予測年数: p.将来予測年数,
        目標F: p.漁獲管理規則.目標F,
        β: p.調整係数β.値,
      });

      // Pipeline context - stores intermediate results
      const context: PipelineContext = {
        入力,
        params: p,
      };

      // Execute pipeline steps in order - NO switch-case needed!
      for (const step of steps) {
        logger.debug(`パイプラインステップ実行: ${step.methodName}`);
        context[step.outputName] = step.execute(context);
      }

      logger.info("コホート解析による ABC 算定が完了しました");

      return context["ABC算定結果"] as ABC算定結果;
    },
  };
}

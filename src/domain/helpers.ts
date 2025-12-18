import {
  type 資源名,
  type 資源グループ呼称,
  資源情報,
  type 未着手資源評価,
  type 文献情報,
  文献リスト,
} from "./models";
import { ABC算定結果, 漁獲量データ, 生物学的データ } from "./data";
import { 資源グループs } from "./constants";
import { logger } from "../utils/logger";

// Re-export user factory functions for backward compatibility
export { to認証済ユーザー, get担当資源情報s } from "./models/user/factory";

export function create資源情報(name: 資源名 | string): 資源情報 {
  const trimmedName = typeof name === "string" ? name.trim() : name;
  logger.debug("create資源情報", { trimmedName });
  if (!trimmedName || trimmedName.length === 0) {
    throw new Error("Stock group name cannot be empty");
  }

  for (const [_key, stockData] of Object.entries(資源グループs)) {
    for (const [_regionKey, regionInfo] of Object.entries(stockData.系群)) {
      const fullName = `${stockData.呼称}${regionInfo.系群名}`;
      logger.debug("create資源情報", { fullName });
      if (fullName === trimmedName) {
        const 呼称 = stockData.呼称 as 資源グループ呼称;
        const 系群名 = regionInfo.系群名;
        const 資源タイプ = regionInfo.資源タイプ;
        const slug = regionInfo.slug;
        return {
          呼称,
          系群名,
          資源タイプ,
          slug,
          equals(other: 資源情報): boolean {
            return fullName === other.toString();
          },
          toString(): string {
            return fullName;
          },
          toDisplayString(formatter?: (呼称: string, 系群名: string) => string): string {
            if (formatter) {
              return formatter(呼称, 系群名);
            }
            return 系群名 ? `${呼称} ${系群名}` : 呼称;
          },
        };
      }
    }
  }

  throw new Error(`不正な資源名: ${trimmedName}`);
}

function createType1Stock(stockGroup: 資源情報): 未着手資源評価 {
  return createStock(stockGroup, {
    資源量推定方法の参照URL: "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf",
    ABC算定: (abundance) => ({
      value: `Simulated WITH recruitment using its abundance "${abundance}"`,
      unit: "トン",
      資源量: { 値: abundance, 単位: "トン" },
    }),
  });
}

function createType2Stock(stockGroup: 資源情報): 未着手資源評価 {
  return createStock(stockGroup, {
    資源量推定方法の参照URL: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    ABC算定: (abundance) => ({
      value: `Simulated WITHOUT recruitment using its abundance "${abundance}"`,
      unit: "トン",
      資源量: { 値: abundance, 単位: "トン" },
    }),
  });
}

function createType3Stock(stockGroup: 資源情報): 未着手資源評価 {
  return createStock(stockGroup, {
    資源量推定方法の参照URL: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    ABC算定: (abundance) => ({
      value: `ABC estimated DIRECTLY using its abundance "${abundance}"`,
      unit: "トン",
      資源量: { 値: abundance, 単位: "トン" },
    }),
  });
}

/**
 * Create a 資源評価 from a 資源情報, automatically selecting the correct type
 * based on the 資源情報's type property.
 *
 * @param stockGroup - The stock group to create a stock for
 * @returns A 資源評価 of the appropriate type
 *
 * @example
 * ```typescript
 * const stockGroup = create資源情報(資源名.マイワシ太平洋);
 * const stock = create資源評価(stockGroup); // Creates Type1Stock
 * ```
 */
export function create資源評価(stockGroup: 資源情報): 未着手資源評価 {
  switch (stockGroup.資源タイプ) {
    case 1:
      return createType1Stock(stockGroup);
    case 2:
      return createType2Stock(stockGroup);
    case 3:
      return createType3Stock(stockGroup);
    default:
      throw new Error(`不正な資源情報: ${stockGroup.資源タイプ}`);
  }
}

interface StockConfig {
  資源量推定方法の参照URL: string;
  ABC算定: (資源量: string) => ABC算定結果;
}

function createStock(stockGroup: 資源情報, config: StockConfig): 未着手資源評価 {
  let abundance: string | undefined;

  return {
    作業ステータス: "未着手",
    対象: stockGroup,
    get 資源量() {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call 資源量推定() first.");
      }
      return abundance;
    },
    資源量推定(catchData: 漁獲量データ, biologicalData: 生物学的データ): 未着手資源評価 {
      abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
      return this;
    },
    ABC算定(): ABC算定結果 {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call 資源量推定() first.");
      }
      return config.ABC算定(abundance);
    },
  };
}

export function create文献リスト(初期文献情報: 文献情報[] = []): 文献リスト {
  const 文献一覧 = [...初期文献情報];

  return {
    文献追加(文献: 文献情報) {
      文献一覧.push(文献);
    },
    文献一覧(): readonly 文献情報[] {
      return 文献一覧;
    },
  };
}

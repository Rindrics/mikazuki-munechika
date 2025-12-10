import {
  AuthenticatedUser,
  User,
  StockGroupRoleAssignment,
  StockGroupName,
  StockGroup,
  FisheryStock,
} from "./models";
import { AcceptableBiologicalCatch, CatchData, BiologicalData } from "./data";
import { STOCK_GROUPS, StockType } from "./constants";
import { logger } from "../utils/logger";

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return user as AuthenticatedUser;
}

export function getStockGroupRoleAssignments(user: User): StockGroupRoleAssignment[] {
  return Object.entries(user.rolesByStockGroup)
    .filter(([_, role]) => role !== undefined)
    .map(([stockGroupName, role]) => ({
      stockGroupName: stockGroupName as StockGroupName,
      role: role!,
    }));
}

export function createStockGroup(name: StockGroupName | string): StockGroup {
  const trimmedName = typeof name === "string" ? name.trim() : name;
  logger.debug("createStockGroup", { trimmedName });
  if (!trimmedName || trimmedName.length === 0) {
    throw new Error("Stock group name cannot be empty");
  }

  for (const [_key, stockData] of Object.entries(STOCK_GROUPS)) {
    for (const [_regionKey, regionInfo] of Object.entries(stockData.regions)) {
      const fullName = `${stockData.call_name}${regionInfo.name}`;
      logger.debug("createStockGroup", { fullName });
      if (fullName === trimmedName) {
        return createStockGroupObject(
          fullName as StockGroupName,
          stockData.call_name,
          regionInfo.name,
          regionInfo.type
        );
      }
    }
  }

  throw new Error(`Unknown stock group name: ${trimmedName}`);
}

function createType1Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf",
    assess: (abundance) => ({
      value: `Simulated WITH recruitment using its abundance "${abundance}"`,
    }),
  });
}

function createType2Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
      value: `Simulated WITHOUT recruitment using its abundance "${abundance}"`,
    }),
  });
}

function createType3Stock(stockGroup: StockGroup): FisheryStock {
  return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
      value: `ABC estimated DIRECTLY using its abundance "${abundance}"`,
    }),
  });
}

/**
 * Create a FisheryStock from a StockGroup, automatically selecting the correct type
 * based on the StockGroup's type property.
 *
 * @param stockGroup - The stock group to create a stock for
 * @returns A FisheryStock of the appropriate type
 *
 * @example
 * ```typescript
 * const stockGroup = createStockGroup(STOCK_GROUP_NAMES.マイワシ太平洋);
 * const stock = createFisheryStock(stockGroup); // Creates Type1Stock
 * ```
 */
export function createFisheryStock(stockGroup: StockGroup): FisheryStock {
  switch (stockGroup.type) {
    case 1:
      return createType1Stock(stockGroup);
    case 2:
      return createType2Stock(stockGroup);
    case 3:
      return createType3Stock(stockGroup);
    default:
      throw new Error(`Unknown stock type: ${stockGroup.type}`);
  }
}

function createStockGroupObject(
  name: StockGroupName,
  call_name: string,
  region: string,
  type: StockType
): StockGroup {
  return {
    name,
    call_name,
    region,
    type,
    equals(other: StockGroup): boolean {
      return name === other.name;
    },
    toString(): string {
      return name;
    },
    toDisplayString(formatter?: (callName: string, region: string) => string): string {
      if (formatter) {
        return formatter(call_name, region);
      }
      return region ? `${call_name} ${region}` : call_name;
    },
    fullName(): StockGroupName {
      return name;
    },
  };
}

interface StockConfig {
  reference: string;
  assess: (abundance: string) => AcceptableBiologicalCatch;
}

function createStock(stockGroup: StockGroup, config: StockConfig): FisheryStock {
  let abundance: string | undefined;

  return {
    stockGroup,
    get name() {
      return stockGroup.name;
    },
    reference: config.reference,
    get abundance() {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
      }
      return abundance;
    },
    estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): FisheryStock {
      abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
      return this;
    },
    assess(): AcceptableBiologicalCatch {
      if (abundance === undefined) {
        throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
      }
      return config.assess(abundance);
    },
  };
}

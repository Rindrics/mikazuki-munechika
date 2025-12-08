import { AuthenticatedUser, User, UserStockGroupRole, StockGroupName, StockGroup, FisheryStock } from "./models";
import { AcceptableBiologicalCatch, CatchData, BiologicalData } from "./data";
import { STOCK_GROUPS } from "./constants";
import { logger } from "../utils/logger";

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return user as AuthenticatedUser;
}

export function getUserStockGroupRoles(user: User): UserStockGroupRole[] {
  return Object.entries(user.rolesByStockGroup)
    .filter(([_, role]) => role !== undefined)
    .map(([stockGroupName, role]) => ({
      stockGroupName: stockGroupName as StockGroupName,
      role: role!,
    }));
}

export function createStockGroup(name: StockGroupName | string): StockGroup {
    const trimmedName = typeof name === "string" ? name.trim() : name;
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Stock group name cannot be empty");
    }
  
    for (const [_, stockData] of Object.entries(STOCK_GROUPS)) {
      for (const [regionKey, regionValue] of Object.entries(stockData.regions)) {
        const fullName = `${stockData.call_name}${regionValue}`;
        if (fullName === trimmedName) {
          return createStockGroupObject(
            fullName as StockGroupName,
            stockData.call_name,
            regionValue
          );
        }
      }
    }
  
    logger.warn(`Unknown stock group name: ${trimmedName}. Using name as-is.`);
    const parts = trimmedName.match(/^(.+?)(系群|海域|海)$/);
    if (parts) {
      return createStockGroupObject(trimmedName as StockGroupName, parts[1], parts[2]);
    }
    return createStockGroupObject(trimmedName as StockGroupName, trimmedName, "");
  }
  

export function createType1Stock(stockGroup: StockGroup): FisheryStock {
    return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf",
    assess: (abundance) => ({
    value: `Simulated WITH recruitment using its abundance "${abundance}"`,
    }),
});
}
  
export function createType2Stock(stockGroup: StockGroup): FisheryStock {
return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
    value: `Simulated WITHOUT recruitment using its abundance "${abundance}"`,
    }),
});
}


export function createType3Stock(stockGroup: StockGroup): FisheryStock {
return createStock(stockGroup, {
    reference: "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf",
    assess: (abundance) => ({
    value: `ABC estimated DIRECTLY using its abundance "${abundance}"`,
    }),
});
}

function createStockGroupObject(
name: StockGroupName,
call_name: string,
region: string
): StockGroup {
return {
    name,
    call_name,
    region,
    equals(other: StockGroup): boolean {
    return name === other.name;
    },
    toString(): string {
    return name;
    },
    toDisplayString(separator: string = " "): string {
    return region ? `${call_name}${separator}${region}` : call_name;
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

import { StockGroup } from "../models";
import { STOCK_GROUPS } from "../constants";
import { StockGroupName } from "./models";

export function createStockGroup(name: StockGroupName | string): StockGroup {
  const trimmedName = typeof name === "string" ? name.trim() : name;
  if (!trimmedName || trimmedName.length === 0) {
    throw new Error("Stock group name cannot be empty");
  }

  // Find matching stock group definition in hierarchical structure
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

  // For unknown stock groups, try to parse from name
  console.warn(`Unknown stock group name: ${trimmedName}. Using name as-is.`);
  const parts = trimmedName.match(/^(.+?)(系群|海域|海)$/);
  if (parts) {
    return createStockGroupObject(trimmedName as StockGroupName, parts[1], parts[2]);
  }
  return createStockGroupObject(trimmedName as StockGroupName, trimmedName, "");
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

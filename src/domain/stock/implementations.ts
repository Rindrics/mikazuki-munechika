import { StockGroup } from "../models";
import { STOCK_GROUPS } from "../constants";
import { StockGroupName } from "./models";

export class StockGroupImpl implements StockGroup {
  readonly name: StockGroupName;
  readonly call_name: string;
  readonly region: string;

  constructor(name: StockGroupName | string) {
    const trimmedName = typeof name === "string" ? name.trim() : name;
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Stock group name cannot be empty");
    }

    // Find matching stock group definition in hierarchical structure
    let stockGroupDef:
      | {
          call_name: string;
          region: string;
        }
      | undefined;

    for (const [_, stockData] of Object.entries(STOCK_GROUPS)) {
      for (const [regionKey, regionValue] of Object.entries(stockData.regions)) {
        const fullName = `${stockData.call_name}${regionValue}`;
        if (fullName === trimmedName) {
          stockGroupDef = {
            call_name: stockData.call_name,
            region: regionValue,
          };
          break;
        }
      }
      if (stockGroupDef) break;
    }

    if (!stockGroupDef) {
      console.warn(
        `Unknown stock group name: ${trimmedName}. Using name as-is.`
      );
      // For unknown stock groups, try to parse from name
      // This is a fallback for database-loaded values
      this.name = trimmedName as StockGroupName;
      // Try to split by common patterns (this is a heuristic)
      const parts = trimmedName.match(/^(.+?)(系群|海域|海)$/);
      if (parts) {
        this.call_name = parts[1];
        this.region = parts[2];
      } else {
        this.call_name = trimmedName;
        this.region = "";
      }
    } else {
      const fullName = `${stockGroupDef.call_name}${stockGroupDef.region}`;
      this.name = fullName as StockGroupName;
      this.call_name = stockGroupDef.call_name;
      this.region = stockGroupDef.region;
    }
  }

  equals(other: StockGroup): boolean {
    return this.name === other.name;
  }

  toString(): string {
    return this.name;
  }

  toDisplayString(separator: string = " "): string {
    return this.region ? `${this.call_name}${separator}${this.region}` : this.call_name;
  }
}

import { StockGroup, StockGroupName, STOCK_GROUPS } from "../models";

export class StockGroupImpl implements StockGroup {
  readonly name: StockGroupName;
  readonly species: string;
  readonly region: string;

  constructor(name: StockGroupName | string) {
    const trimmedName = typeof name === "string" ? name.trim() : name;
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Stock group name cannot be empty");
    }

    // Find matching stock group definition in hierarchical structure
    let stockGroupDef:
      | {
          species: string;
          region: string;
        }
      | undefined;

    for (const [_, speciesData] of Object.entries(STOCK_GROUPS)) {
      for (const [regionKey, regionValue] of Object.entries(speciesData.regions)) {
        const fullName = `${speciesData.species}${regionValue}`;
        if (fullName === trimmedName) {
          stockGroupDef = {
            species: speciesData.species,
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
        this.species = parts[1];
        this.region = parts[2];
      } else {
        this.species = trimmedName;
        this.region = "";
      }
    } else {
      const fullName = `${stockGroupDef.species}${stockGroupDef.region}`;
      this.name = fullName as StockGroupName;
      this.species = stockGroupDef.species;
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
    return this.region ? `${this.species}${separator}${this.region}` : this.species;
  }
}

export function createStockGroup(name: StockGroupName | string): StockGroup {
  return new StockGroupImpl(name);
}


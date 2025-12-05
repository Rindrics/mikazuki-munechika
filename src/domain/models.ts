export interface AcceptableBiologicalCatch {
    value: string;
}

export interface CatchData {
    value: string;
}

export interface BiologicalData {
    value: string;
}

export const STOCK_GROUP_NAMES = {
  MAIWASHI_PACIFIC: "マイワシ太平洋系群",
  ZUWAIGANI_OKHOTSK: "ズワイガニオホーツク海系群",
} as const;

export type StockGroupName =
  (typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];

export class StockGroup {
  readonly name: StockGroupName;

  constructor(name: StockGroupName | string) {
    const trimmedName = typeof name === "string" ? name.trim() : name;
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Stock group name cannot be empty");
    }

    const validNames = Object.values(STOCK_GROUP_NAMES);
    if (!validNames.includes(trimmedName as StockGroupName)) {
      console.warn(
        `Unknown stock group name: ${trimmedName}.`
      );
    }
    this.name = trimmedName as StockGroupName;
  }

  equals(other: StockGroup): boolean {
    return this.name === other.name;
  }

  toString(): string {
    return this.name;
  }
}

export abstract class FisheryStockBase {
  private static nextId: number = 1;
  readonly id: number;
  readonly stockGroup: StockGroup;
  #abundance: string | undefined;

  constructor(stockGroup: StockGroup | string) {
    this.id = FisheryStockBase.nextId++;
    this.stockGroup =
      typeof stockGroup === "string" ? new StockGroup(stockGroup) : stockGroup;
  }

  get name(): string {
    return this.stockGroup.name;
  }

  abstract readonly reference: string;

  get abundance(): string {
    if (this.#abundance === undefined) {
      throw new Error("Abundance has not been estimated. Call estimateAbundance() first.");
    }
    return this.#abundance;
  }

  // Only way to set abundance
  estimateAbundance(catchData: CatchData, biologicalData: BiologicalData): this {
    this.#abundance = `estimated using ${catchData.value} and ${biologicalData.value}`;
    return this;
  }

  abstract assess(): AcceptableBiologicalCatch;
}

export type FisheryStock = Type1Stock | Type2Stock | Type3Stock;

export class Type1Stock extends FisheryStockBase {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2024-ABCWG02-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Simulation logic with stock-recruitment relationship
    return {
      value: `Simulated WITH recruitment using its abundance "${this.abundance}"`,
    };
  }
}

export class Type2Stock extends FisheryStockBase {
  readonly reference: string = "Thttps://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Simulation logic without stock-recruitment relationship
    return {
      value: `Simulated WITHOUT recruitment using its abundance "${this.abundance}"`,
    };
  }
}

export class Type3Stock extends FisheryStockBase {
  readonly reference: string = "https://abchan.fra.go.jp/references_list/FRA-SA2020-ABCWG01-01.pdf";

  assess(): AcceptableBiologicalCatch {
    // Direct ABC estimation logic
    return {
      value: `ABC estimated DIRECTLY using its abundance "${this.abundance}"`,
    };
  }
}

export const USER_ROLES = {
  PRIMARY: "主担当",
  SECONDARY: "副担当",
  ADMIN: "管理者",
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface UserStockGroupRole {
  stockGroupName: StockGroupName;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  // Map of stock group name to role
  // A user can have different roles for different stock groups
  // e.g., "主担当" for stock group A, "副担当" for stock group B
  // Using stock group name as key for better readability and type safety
  // (stock groups are few in number, so performance is not a concern)
  // Partial because a user may not have roles for all stock groups
  rolesByStockGroup: Partial<Record<StockGroupName, UserRole>>;
}

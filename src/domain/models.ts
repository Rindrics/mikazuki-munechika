export interface AcceptableBiologicalCatch {
    value: string;
}

export interface CatchData {
    value: string;
}

export interface BiologicalData {
    value: string;
}

// Stock groups organized by species (hierarchical structure)
export const STOCK_GROUPS = {
  MAIWASHI: {
    species: "マイワシ",
    regions: {
      PACIFIC: "太平洋系群",
      TSUSHIMA: "対馬暖流系群",
    },
  },
  ZUWAIGANI: {
    species: "ズワイガニ",
    regions: {
      OKHOTSK: "オホーツク海系群",
    },
  },
} as const;

// Flattened structure for backward compatibility and easier access
export const STOCK_GROUP_NAMES = {
  MAIWASHI_PACIFIC: `${STOCK_GROUPS.MAIWASHI.species}${STOCK_GROUPS.MAIWASHI.regions.PACIFIC}`,
  MAIWASHI_TSUSHIMA: `${STOCK_GROUPS.MAIWASHI.species}${STOCK_GROUPS.MAIWASHI.regions.TSUSHIMA}`,
  ZUWAIGANI_OKHOTSK: `${STOCK_GROUPS.ZUWAIGANI.species}${STOCK_GROUPS.ZUWAIGANI.regions.OKHOTSK}`,
} as const;

export type StockGroupName =
  (typeof STOCK_GROUP_NAMES)[keyof typeof STOCK_GROUP_NAMES];

export interface StockGroup {
  readonly name: StockGroupName;
  readonly species: string;
  readonly region: string;
  equals(other: StockGroup): boolean;
  toString(): string;
  toDisplayString(separator?: string): string;
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

declare const __authenticated: unique symbol;
export type AuthenticatedUser = User & {
  readonly [__authenticated]: true;
};

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

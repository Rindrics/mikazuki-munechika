import { ROLES } from "../../constants";
import { StockGroupName } from "../stock";

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * ある資源に対するロールを表す
 * 
 * @example
 * ```typescript
 * const assignment: StockGroupRoleAssignment = {
 *   stockGroupName: STOCK_GROUP_NAMES.マイワシ太平洋,
 *   role: ROLES.主担当,
 * };
 * ```
 */
export interface StockGroupRoleAssignment {
  stockGroupName: StockGroupName;
  role: Role;
}

/**
 * ユーザー
 *
 * ユーザーは系群ごとに異なるロールを持つことができる。
 */
export interface User {
  id: string;
  email: string;
  rolesByStockGroup: Partial<Record<StockGroupName, Role>>;
}

declare const __authenticated: unique symbol;

/**
 * 認証済みユーザー
 */
export type AuthenticatedUser = User & {
  readonly [__authenticated]: true;
};

import { USER_ROLES } from "../../constants";
import { StockGroupName } from "../stock";

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * ユーザーの系群別ロール
 */
export interface UserStockGroupRole {
  stockGroupName: StockGroupName;
  role: UserRole;
}

/**
 * ユーザー
 *
 * ユーザーは系群ごとに異なるロールを持つことができる。
 */
export interface User {
  id: string;
  email: string;
  rolesByStockGroup: Partial<Record<StockGroupName, UserRole>>;
}

declare const __authenticated: unique symbol;

/**
 * 認証済みユーザー
 */
export type AuthenticatedUser = User & {
  readonly [__authenticated]: true;
};

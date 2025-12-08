import { AuthenticatedUser, User, UserStockGroupRole } from "./models";
import { StockGroupName } from "./stock";

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

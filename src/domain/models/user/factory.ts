import { 管理者ロール } from "../../constants";
import { 資源名, 資源情報 } from "../stock";
import type {
  ユーザー,
  評価担当者,
  資源評価管理者,
  認証済ユーザー,
  認証済評価担当者,
  認証済資源評価管理者,
  担当資源情報,
  ロール,
  氏名,
} from "./types";

/**
 * Private storage for user IDs.
 * This WeakMap is not exported, keeping user IDs completely hidden from external code.
 * IDs are stored here at runtime and retrieved only through getUserId().
 *
 * @see ADR 0017 for des  ign rationale
 */
const userIds = new WeakMap<ユーザー, string>();

/**
 * Private storage for authenticated users.
 * Only users that have been authenticated through to認証済ユーザー/to認証済評価担当者 are tracked here.
 */
const authenticatedUsers = new WeakSet<ユーザー>();

/**
 * Create a new user with the given ID.
 * The ID is stored in a private WeakMap and is not accessible from external code.
 *
 * @param id - The user ID (from database)
 * @param 氏名 - The user's name
 * @param メールアドレス - The user's email address
 * @returns A new user object
 */
export function createユーザー(id: string, 氏名: 氏名, メールアドレス: string): ユーザー {
  const user: ユーザー = { 氏名, メールアドレス };
  userIds.set(user, id);
  return user;
}

/**
 * Create a new assessment staff member with the given ID.
 *
 * @param id - The user ID (from database)
 * @param 氏名 - The user's name
 * @param メールアドレス - The user's email address
 * @param 担当資源情報リスト - The stock assignments for this user
 * @returns A new assessment staff object
 */
export function create評価担当者(
  id: string,
  氏名: 氏名,
  メールアドレス: string,
  担当資源情報リスト: Partial<Record<資源名, ロール>> = {}
): 評価担当者 {
  const user: 評価担当者 = { 種別: "評価担当者", 氏名, メールアドレス, 担当資源情報リスト };
  userIds.set(user, id);
  return user;
}

/**
 * Create a new assessment manager with the given ID.
 *
 * @param id - The user ID (from database)
 * @param 氏名 - The user's name
 * @param メールアドレス - The user's email address
 * @returns A new assessment manager object
 */
export function create資源評価管理者(
  id: string,
  氏名: 氏名,
  メールアドレス: string
): 資源評価管理者 {
  const user: 資源評価管理者 = {
    種別: "資源評価管理者",
    氏名,
    メールアドレス,
    ロール: 管理者ロール,
  };
  userIds.set(user, id);
  return user;
}

/**
 * Get the ID of a user.
 * This function is intended for use in the infrastructure layer when
 * persisting users to the database.
 *
 * @param user - The user to get the ID for
 * @returns The user ID, or undefined if not found
 */
export function getUserId(user: ユーザー): string | undefined {
  return userIds.get(user);
}

/**
 * Convert a user to an authenticated user.
 * This is the only way to create an authenticated user, ensuring type safety.
 *
 * @param user - The user to authenticate
 * @returns The authenticated user
 */
export function to認証済ユーザー(user: ユーザー): 認証済ユーザー {
  authenticatedUsers.add(user);
  return user as 認証済ユーザー;
}

/**
 * Convert an assessment staff to an authenticated assessment staff.
 *
 * @param user - The assessment staff to authenticate
 * @returns The authenticated assessment staff
 */
export function to認証済評価担当者(user: 評価担当者): 認証済評価担当者 {
  authenticatedUsers.add(user);
  return user as 認証済評価担当者;
}

/**
 * Convert an assessment manager to an authenticated assessment manager.
 *
 * @param 未認証の資源評価管理者 - The assessment manager to authenticate
 * @returns The authenticated assessment manager
 */
export function to認証済資源評価管理者(
  未認証の資源評価管理者: 資源評価管理者
): 認証済資源評価管理者 {
  authenticatedUsers.add(未認証の資源評価管理者);
  return 未認証の資源評価管理者 as 認証済資源評価管理者;
}

/**
 * Check if a user is authenticated.
 *
 * @param user - The user to check
 * @returns true if the user has been authenticated
 */
export function is認証済(user: ユーザー): boolean {
  return authenticatedUsers.has(user);
}

/**
 * Get the list of assigned stocks for an assessment staff member.
 *
 * @param user - The assessment staff to get assigned stocks for
 * @returns Array of stock assignment information
 */
export function get担当資源情報s(user: 評価担当者): 担当資源情報[] {
  return Object.entries(user.担当資源情報リスト)
    .filter(([_, role]) => role !== undefined)
    .map(([担当資源名, ロール]) => ({
      担当資源名: 担当資源名 as 資源名,
      ロール: ロール as ロール,
    }));
}

/**
 * Check if a user has access permission for a specific stock.
 *
 * @param user - The authenticated user (評価担当者 or 資源評価管理者)
 * @param 対象資源名 - The stock name to check access for
 * @returns true if user has access permission
 */
export function has資源アクセス権限(
  user: 認証済評価担当者 | 資源評価管理者,
  対象資源名: 資源名
): boolean {
  switch (user.種別) {
    case "評価担当者":
      return 対象資源名 in user.担当資源情報リスト;
    case "資源評価管理者":
      return true;
  }
}

/**
 * Get the list of assessable stocks with role information.
 *
 * @param user - The authenticated user (評価担当者 or 資源評価管理者)
 * @param 全資源名s - All available stock names (required for 管理者)
 * @returns Array of stock assignment information
 */
export function get評価可能資源s(
  user: 認証済評価担当者 | 資源評価管理者,
  全資源名s: 資源名[]
): 担当資源情報[] {
  switch (user.種別) {
    case "評価担当者":
      return get担当資源情報s(user);
    case "資源評価管理者":
      return 全資源名s.map((資源名) => ({
        担当資源名: 資源名,
        ロール: 管理者ロール,
      }));
  }
}

/**
 * Get the list of accessible stock information for a user.
 *
 * @param user - The authenticated user (評価担当者 or 資源評価管理者)
 * @param 全資源情報 - All available stock information
 * @returns Array of accessible stock information
 */
export function get閲覧可能資源情報s(
  user: 認証済評価担当者 | 資源評価管理者,
  全資源情報: 資源情報[]
): 資源情報[] {
  switch (user.種別) {
    case "評価担当者":
      return 全資源情報.filter((資源) =>
        Object.keys(user.担当資源情報リスト).includes(資源.toString())
      );
    case "資源評価管理者":
      return 全資源情報;
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import {
  UserRepository,
  User,
  AuthenticatedUser,
  toAuthenticatedUser,
  StockGroupName,
  UserRole,
} from "@/domain";
import { getSupabaseClient } from "./supabase-client";

export class SupabaseUserRepository implements UserRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // For client-side, we can only get the current user
    // To find by email, we need to check if the current user matches
    const {
      data: { user: currentUser },
    } = await this.supabase.auth.getUser();

    if (!currentUser || currentUser.email !== email) {
      return undefined;
    }

    return this.buildUserFromAuthUser(currentUser.id, email);
  }

  async findById(id: string): Promise<User | undefined> {
    // Get current user and check if ID matches
    const {
      data: { user: currentUser },
    } = await this.supabase.auth.getUser();

    if (!currentUser || currentUser.id !== id) {
      return undefined;
    }

    return this.buildUserFromAuthUser(id, currentUser.email || "");
  }

  async authenticate(email: string, password: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return null;
    }

    const user = await this.buildUserFromAuthUser(data.user.id, data.user.email || email);
    return user ? toAuthenticatedUser(user) : null;
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const user = await this.buildUserFromAuthUser(
      session.user.id,
      session.user.email || ""
    );
    return user ? toAuthenticatedUser(user) : null;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.buildUserFromAuthUser(
          session.user.id,
          session.user.email || ""
        );
        callback(user ? toAuthenticatedUser(user) : null);
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async findByStockGroupName(stockGroupName: StockGroupName): Promise<User[]> {
    // Get stock group ID from name
    const { data: stockGroup, error: stockGroupError } = await this.supabase
      .from("stock_groups")
      .select("id")
      .eq("name", stockGroupName)
      .single();

    if (stockGroupError || !stockGroup) {
      return [];
    }

    // Get all users with roles for this stock group
    // Note: This requires RLS policies that allow reading user_stock_group_roles
    const { data: userRoles, error: userRolesError } = await this.supabase
      .from("user_stock_group_roles")
      .select("user_id, role")
      .eq("stock_group_id", stockGroup.id);

    if (userRolesError || !userRoles) {
      return [];
    }

    // Build users from the results
    // Note: In client-side, we can only get user info through RLS policies
    // We need to fetch each user individually
    const userIds = [...new Set(userRoles.map((ur) => ur.user_id))];
    const users: User[] = [];

    for (const userId of userIds) {
      // Get user email from auth.users (requires RLS or service role)
      // For now, we'll try to build user with available data
      const userRolesForUser = userRoles.filter((ur) => ur.user_id === userId);
      const rolesByStockGroup: Partial<Record<StockGroupName, UserRole>> = {};

      for (const userRole of userRolesForUser) {
        rolesByStockGroup[stockGroupName] = userRole.role as UserRole;
      }

      // Try to get email from current session or user metadata
      const {
        data: { user: currentUser },
      } = await this.supabase.auth.getUser();

      const email =
        currentUser && currentUser.id === userId
          ? currentUser.email || ""
          : `user-${userId.substring(0, 8)}`;

      users.push({
        id: userId,
        email,
        rolesByStockGroup,
      });
    }

    return users;
  }

  private async buildUserFromAuthUser(
    userId: string,
    email: string
  ): Promise<User | undefined> {
    // Get all roles for this user with stock group names
    const { data: userRoles, error: userRolesError } = await this.supabase
      .from("user_stock_group_roles")
      .select(
        `
        role,
        stock_groups!inner(name)
      `
      )
      .eq("user_id", userId);

    if (userRolesError) {
      return undefined;
    }

    // Build rolesByStockGroup mapping
    const rolesByStockGroup: Partial<Record<StockGroupName, UserRole>> = {};

    if (userRoles) {
      for (const userRole of userRoles) {
        // Handle Supabase JOIN result type
        const stockGroups = userRole.stock_groups;
        if (Array.isArray(stockGroups) && stockGroups.length > 0) {
          const stockGroupName = stockGroups[0].name as StockGroupName;
          const role = userRole.role as UserRole;
          rolesByStockGroup[stockGroupName] = role;
        } else if (stockGroups && typeof stockGroups === "object" && "name" in stockGroups) {
          const stockGroupName = (stockGroups as { name: string }).name as StockGroupName;
          const role = userRole.role as UserRole;
          rolesByStockGroup[stockGroupName] = role;
        }
      }
    }

    return {
      id: userId,
      email,
      rolesByStockGroup,
    };
  }
}


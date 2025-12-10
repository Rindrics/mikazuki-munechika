import { SupabaseClient } from "@supabase/supabase-js";
import {
  ユーザーRepository,
  ユーザー,
  認証済ユーザー,
  to認証済ユーザー,
  資源名,
  ロール,
} from "@/domain";
import { getSupabaseClient } from "./supabase-client";
import { logger } from "@/utils/logger";

export class SupabaseユーザーRepository implements ユーザーRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  async findByEmail(email: string): Promise<ユーザー | undefined> {
    // For client-side, we can only get the current user
    // To find by email, we need to check if the current user matches
    const {
      data: { user: currentユーザー },
    } = await this.supabase.auth.getUser();

    if (!currentユーザー || currentユーザー.email !== email) {
      logger.debug("findByEmail failed: user not found", { email });
      return undefined;
    }

    return this.buildユーザーFromAuthユーザー(currentユーザー.id, email);
  }

  async findById(id: string): Promise<ユーザー | undefined> {
    // Get current user and check if ID matches
    const {
      data: { user: currentユーザー },
    } = await this.supabase.auth.getUser();

    if (!currentユーザー || currentユーザー.id !== id) {
      logger.debug("findById failed: user not found", { id });
      return undefined;
    }

    return this.buildユーザーFromAuthユーザー(id, currentユーザー.email || "");
  }

  async authenticate(email: string, password: string): Promise<認証済ユーザー | null> {
    logger.debug("authenticate called", { email });

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        logger.debug("authenticate failed", { email, error: error?.message });
        return null;
      }

      const user = await this.buildユーザーFromAuthユーザー(data.user.id, data.user.email || email);
      if (!user) {
        logger.debug("authenticate failed: could not build user", { email, userId: data.user.id });
        return null;
      }

      logger.debug("authenticate completed", { userId: user.id, email });
      return to認証済ユーザー(user);
    } catch (error) {
      logger.error("authenticate failed", { email }, error as Error);
      throw error;
    }
  }

  async getCurrentユーザー(): Promise<認証済ユーザー | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const user = await this.buildユーザーFromAuthユーザー(session.user.id, session.user.email || "");
    return user ? to認証済ユーザー(user) : null;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  onAuthStateChange(callback: (user: 認証済ユーザー | null) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.buildユーザーFromAuthユーザー(session.user.id, session.user.email || "");
        callback(user ? to認証済ユーザー(user) : null);
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async findBy資源名(担当資源名: 資源名): Promise<ユーザー[]> {
    // Get stock group ID from name
    const { data: stockGroup, error: stockGroupError } = await this.supabase
      .from("stock_groups")
      .select("id")
      .eq("name", 担当資源名)
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
    const users: ユーザー[] = [];

    for (const userId of userIds) {
      // Get user email from auth.users (requires RLS or service role)
      // For now, we'll try to build user with available data
      const userRolesForユーザー = userRoles.filter((ur) => ur.user_id === userId);
      const 担当資源情報リスト: Partial<Record<資源名, ロール>> = {};

      for (const userRole of userRolesForユーザー) {
        担当資源情報リスト[担当資源名] = userRole.role as ロール;
      }

      // Try to get email from current session or user metadata
      const {
        data: { user: currentユーザー },
      } = await this.supabase.auth.getUser();

      const email =
        currentユーザー && currentユーザー.id === userId
          ? currentユーザー.email || ""
          : `user-${userId.substring(0, 8)}`;

      users.push({
        id: userId,
        メールアドレス: email,
        担当資源情報リスト,
      });
    }

    return users;
  }

  private async buildユーザーFromAuthユーザー(userId: string, email: string): Promise<ユーザー | undefined> {
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
      logger.debug("failed: could not get user roles", {
        userId,
        email,
        error: userRolesError.message,
      });
      return undefined;
    }

    // Build 担当資源情報リスト mapping
    const 担当資源情報リスト: Partial<Record<資源名, ロール>> = {};

    if (userRoles) {
      for (const userRole of userRoles) {
        // Handle Supabase JOIN result type
        const stockGroups = userRole.stock_groups;
        if (Array.isArray(stockGroups) && stockGroups.length > 0) {
          const 担当資源名 = stockGroups[0].name as 資源名;
          const role = userRole.role as ロール
          ;
          担当資源情報リスト[担当資源名] = role;
        } else if (stockGroups && typeof stockGroups === "object" && "name" in stockGroups) {
          const 担当資源名 = (stockGroups as { name: string }).name as 資源名;
          const role = userRole.role as ロール;
          担当資源情報リスト[担当資源名] = role;
        }
      }
    }

    logger.debug("completed", { userId, email, 担当資源情報リスト });
    return {
      id: userId,
      メールアドレス: email,
      担当資源情報リスト,
    };
  }
}

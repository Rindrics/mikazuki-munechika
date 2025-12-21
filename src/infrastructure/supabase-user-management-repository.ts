import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ユーザー管理Repository,
  ユーザー情報,
  ユーザー招待データ,
} from "@/domain/repositories";
import type { 資源名, ロール } from "@/domain";
import { getSupabaseServiceRoleClient } from "./supabase-server-client";
import { logger } from "@/utils/logger";

/**
 * Supabase implementation of ユーザー管理Repository
 * Uses service_role client for admin operations
 */
export class Supabaseユーザー管理Repository implements ユーザー管理Repository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseServiceRoleClient();
  }

  async findAll(): Promise<ユーザー情報[]> {
    logger.debug("findAll called");

    // Get all users from auth.users with their profiles
    const { data: authUsers, error: authError } = await this.supabase.auth.admin.listUsers();

    if (authError) {
      logger.error("Failed to list users", {}, authError as Error);
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    // Get all user profiles
    const { data: profiles, error: profilesError } = await this.supabase
      .from("user_profiles")
      .select("id, name");

    if (profilesError) {
      logger.error("Failed to get user profiles", {}, profilesError as Error);
      throw new Error(`Failed to get user profiles: ${profilesError.message}`);
    }

    // Get all user roles with stock group names
    const { data: userRoles, error: rolesError } = await this.supabase.from(
      "user_stock_group_roles"
    ).select(`
        user_id,
        role,
        stock_groups!inner(name)
      `);

    if (rolesError) {
      logger.error("Failed to get user roles", {}, rolesError as Error);
      throw new Error(`Failed to get user roles: ${rolesError.message}`);
    }

    // Build profile map
    const profileMap = new Map<string, string>();
    for (const profile of profiles || []) {
      profileMap.set(profile.id, profile.name);
    }

    // Build role map
    const roleMap = new Map<string, Array<{ 資源名: 資源名; ロール: ロール }>>();
    for (const userRole of userRoles || []) {
      const stockGroups = userRole.stock_groups;
      let stockName: string | null = null;

      if (Array.isArray(stockGroups) && stockGroups.length > 0) {
        stockName = stockGroups[0].name;
      } else if (stockGroups && typeof stockGroups === "object" && "name" in stockGroups) {
        stockName = (stockGroups as { name: string }).name;
      }

      if (stockName) {
        const existing = roleMap.get(userRole.user_id) || [];
        existing.push({
          資源名: stockName as 資源名,
          ロール: userRole.role as ロール,
        });
        roleMap.set(userRole.user_id, existing);
      }
    }

    // Combine data and sort by email address
    const users: ユーザー情報[] = authUsers.users
      .map((authUser) => ({
        id: authUser.id,
        氏名: profileMap.get(authUser.id) || "",
        メールアドレス: authUser.email || "",
        担当資源: roleMap.get(authUser.id) || [],
      }))
      .sort((a, b) => a.メールアドレス.localeCompare(b.メールアドレス));

    logger.debug("findAll completed", { count: users.length });
    return users;
  }

  async invite(data: ユーザー招待データ, inviterEmail?: string): Promise<{ userId: string }> {
    logger.debug("invite called", { email: data.メールアドレス, name: data.氏名 });

    // Build assignment description for email
    const assignmentDescriptions = data.担当資源.map((r) => `${r.資源名}の${r.ロール}`);
    const assignmentText =
      assignmentDescriptions.length > 0 ? assignmentDescriptions.join("、") : "";

    // Validate redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      logger.error("NEXT_PUBLIC_APP_URL is not configured");
      throw new Error("Application URL is not configured. Cannot send invitation.");
    }
    const redirectTo = `${appUrl.replace(/\/+$/, "")}/`;

    // Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } =
      await this.supabase.auth.admin.inviteUserByEmail(data.メールアドレス, {
        redirectTo,
        data: {
          inviter_email: inviterEmail || "管理者",
          assignment_text: assignmentText,
          invited_name: data.氏名,
        },
      });

    if (inviteError || !inviteData.user) {
      logger.error("Failed to invite user", { email: data.メールアドレス }, inviteError as Error);
      throw new Error(`Failed to invite user: ${inviteError?.message || "Unknown error"}`);
    }

    const userId = inviteData.user.id;

    // Create user profile
    const { error: profileError } = await this.supabase.from("user_profiles").insert({
      id: userId,
      name: data.氏名,
    });

    if (profileError) {
      logger.error("Failed to create user profile", { userId }, profileError as Error);
      // Try to clean up the user if profile creation fails
      await this.supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Assign stock roles
    try {
      await this.assignStockRoles(userId, data.担当資源);
    } catch (assignError) {
      logger.error("Failed to assign stock roles", { userId }, assignError as Error);

      // Clean up: delete profile and user
      try {
        const { error: profileDeleteError } = await this.supabase
          .from("user_profiles")
          .delete()
          .eq("id", userId);

        if (profileDeleteError) {
          logger.error(
            "Cleanup failed: could not delete user profile",
            { userId },
            profileDeleteError as Error
          );
        } else {
          logger.info("Cleanup: user profile deleted", { userId });
        }

        const { error: userDeleteError } = await this.supabase.auth.admin.deleteUser(userId);

        if (userDeleteError) {
          logger.error(
            "Cleanup failed: could not delete user",
            { userId },
            userDeleteError as Error
          );
        } else {
          logger.info("Cleanup: user deleted", { userId });
        }
      } catch (cleanupError) {
        logger.error("Cleanup failed unexpectedly", { userId }, cleanupError as Error);
      }

      throw assignError;
    }

    logger.info("User invited successfully", { userId, email: data.メールアドレス });
    return { userId };
  }

  async updateAssignments(
    userId: string,
    担当資源: Array<{ 資源名: 資源名; ロール: ロール }>
  ): Promise<void> {
    logger.debug("updateAssignments called", { userId, 担当資源 });

    // NOTE: Supabase JS client does not support transactions directly.
    // We implement a manual rollback strategy: save existing roles before delete,
    // and restore them if assignStockRoles fails.

    // Fetch and save existing roles for potential rollback
    const { data: existingRoles, error: fetchError } = await this.supabase
      .from("user_stock_group_roles")
      .select("stock_group_id, role")
      .eq("user_id", userId);

    if (fetchError) {
      logger.error("Failed to fetch existing roles", { userId }, fetchError as Error);
      throw new Error(`Failed to fetch existing roles: ${fetchError.message}`);
    }

    const savedRoles = existingRoles || [];
    logger.debug("Saved existing roles for rollback", { userId, roleCount: savedRoles.length });

    // Delete all existing roles for this user
    const { error: deleteError } = await this.supabase
      .from("user_stock_group_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      logger.error("Failed to delete existing roles", { userId }, deleteError as Error);
      throw new Error(`Failed to delete existing roles: ${deleteError.message}`);
    }

    // Assign new roles, with rollback on failure
    try {
      await this.assignStockRoles(userId, 担当資源);
    } catch (assignError) {
      logger.error("Failed to assign new roles, attempting rollback", { userId }, assignError as Error);

      // Restore saved roles
      if (savedRoles.length > 0) {
        const rolesToRestore = savedRoles.map((r) => ({
          user_id: userId,
          stock_group_id: r.stock_group_id,
          role: r.role,
        }));

        const { error: restoreError } = await this.supabase
          .from("user_stock_group_roles")
          .insert(rolesToRestore);

        if (restoreError) {
          logger.error(
            "Rollback failed: could not restore previous roles",
            { userId },
            restoreError as Error
          );
        } else {
          logger.info("Rollback successful: restored previous roles", { userId, roleCount: savedRoles.length });
        }
      }

      throw assignError;
    }

    logger.info("User assignments updated", { userId });
  }

  async delete(userId: string): Promise<void> {
    logger.debug("delete called", { userId });

    // First, delete user_stock_group_roles to trigger audit logging
    // while the user still exists (avoids FK constraint violation in audit_logs)
    const { error: rolesError } = await this.supabase
      .from("user_stock_group_roles")
      .delete()
      .eq("user_id", userId);

    if (rolesError) {
      logger.error("Failed to delete user roles", { userId }, rolesError as Error);
      throw new Error(`Failed to delete user roles: ${rolesError.message}`);
    }

    // Then delete user via Supabase Auth Admin API
    // This will cascade delete user_profiles
    const { error } = await this.supabase.auth.admin.deleteUser(userId);

    if (error) {
      logger.error("Failed to delete user", { userId }, error as Error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    logger.info("User deleted successfully", { userId });
  }

  /**
   * Helper to assign stock roles to a user
   */
  private async assignStockRoles(
    userId: string,
    担当資源: Array<{ 資源名: 資源名; ロール: ロール }>
  ): Promise<void> {
    if (担当資源.length === 0) {
      return;
    }

    // Get stock group IDs
    const stockNames = 担当資源.map((r) => r.資源名);
    const { data: stockGroups, error: stockError } = await this.supabase
      .from("stock_groups")
      .select("id, name")
      .in("name", stockNames);

    if (stockError) {
      logger.error("Failed to get stock groups", { stockNames }, stockError as Error);
      throw new Error(`Failed to get stock groups: ${stockError.message}`);
    }

    // Build stock group ID map
    const stockGroupIdMap = new Map<string, string>();
    for (const sg of stockGroups || []) {
      stockGroupIdMap.set(sg.name, sg.id);
    }

    // Insert roles
    const rolesToInsert = 担当資源
      .filter((r) => stockGroupIdMap.has(r.資源名))
      .map((r) => ({
        user_id: userId,
        stock_group_id: stockGroupIdMap.get(r.資源名)!,
        role: r.ロール,
      }));

    if (rolesToInsert.length > 0) {
      const { error: insertError } = await this.supabase
        .from("user_stock_group_roles")
        .insert(rolesToInsert);

      if (insertError) {
        logger.error("Failed to insert user roles", { userId }, insertError as Error);
        throw new Error(`Failed to insert user roles: ${insertError.message}`);
      }
    }
  }
}

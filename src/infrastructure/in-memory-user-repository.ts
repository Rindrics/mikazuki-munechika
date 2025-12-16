import {
  ユーザーRepository,
  ユーザー,
  評価担当者,
  認証済ユーザー,
  to認証済ユーザー,
  create評価担当者,
  getUserId,
  資源名s,
  ロールs,
} from "@/domain";
import { logger } from "@/utils/logger";
import { 資源名 } from "@/domain/models/stock";

function encodeForStorage(value: string): string {
  return btoa(value);
}

function decodeFromStorage(encoded: string): string {
  return atob(encoded);
}

// ユーザー data with passwords for in-memory repository (used in preview environments)
// These match the users created by the create-users script (ADR 0003)
const INITIAL_USER_DATA = [
  {
    id: "user-maiwashi-primary-id",
    email: "maiwashi-primary@example.com",
    password: "maiwashi-primary123",
    rolesByStockGroup: {
      [資源名s.マイワシ太平洋]: ロールs.主担当,
    },
  },
  {
    id: "user-maiwashi-secondary-id",
    email: "maiwashi-secondary@example.com",
    password: "maiwashi-secondary123",
    rolesByStockGroup: {
      [資源名s.マイワシ太平洋]: ロールs.副担当,
    },
  },
  {
    id: "user-zuwaigani-primary-id",
    email: "zuwaigani-primary@example.com",
    password: "zuwaigani-primary123",
    rolesByStockGroup: {
      [資源名s.ズワイガニオホーツク]: ロールs.主担当,
    },
  },
  {
    id: "user-zuwaigani-secondary-id",
    email: "zuwaigani-secondary@example.com",
    password: "zuwaigani-secondary123",
    rolesByStockGroup: {
      [資源名s.ズワイガニオホーツク]: ロールs.副担当,
    },
  },
  {
    id: "user-admin-id",
    email: "admin@example.com",
    password: "admin123",
    // Admin has "管理者" role for all stock groups
    rolesByStockGroup: {
      [資源名s.マイワシ太平洋]: ロールs.管理者,
      [資源名s.ズワイガニオホーツク]: ロールs.管理者,
    },
  },
] as const;

export class InMemoryユーザーRepository implements ユーザーRepository {
  private usersById: Map<string, 評価担当者> = new Map();
  private usersByEmail: Map<string, 評価担当者> = new Map();
  private passwordsByEmail: Map<string, string> = new Map();

  constructor() {
    // Initialize with default users using factory function
    for (const userData of INITIAL_USER_DATA) {
      const user = create評価担当者(
        userData.id,
        "", // 氏名 (not used in preview)
        userData.email,
        userData.rolesByStockGroup
      );
      const userId = getUserId(user);
      if (!userId) {
        logger.error("Failed to get user ID - possible bug in factory", {
          email: userData.email,
        });
        continue;
      }
      this.usersById.set(userId, user);
      this.usersByEmail.set(user.メールアドレス, user);
      this.passwordsByEmail.set(user.メールアドレス, userData.password);
    }
  }

  async authenticate(email: string, password: string): Promise<認証済ユーザー | null> {
    logger.debug("authenticate called", { email });

    try {
      const user = this.usersByEmail.get(email);
      if (!user) {
        logger.debug("authenticate failed: user not found", { email });
        return null;
      }

      const storedPassword = this.passwordsByEmail.get(email);
      if (storedPassword !== password) {
        logger.debug("authenticate failed: invalid password", { email });
        return null;
      }

      // Store encoded user ID in localStorage for session persistence
      const userId = getUserId(user);
      if (!userId) {
        logger.warn("authenticate: session persistence skipped - missing userId", {
          email,
        });
      } else if (typeof window !== "undefined") {
        localStorage.setItem("auth_user_id", encodeForStorage(userId));
      }

      logger.debug("authenticate completed", { userId, email });
      return to認証済ユーザー(user);
    } catch (error) {
      logger.error("authenticate failed", { email }, error as Error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<ユーザー | undefined> {
    return this.usersByEmail.get(email);
  }

  async findById(id: string): Promise<ユーザー | undefined> {
    return this.usersById.get(id);
  }

  async findBy資源名(担当資源名: 資源名): Promise<ユーザー[]> {
    return Array.from(this.usersById.values()).filter(
      (user) => user.担当資源情報リスト[担当資源名] !== undefined
    );
  }

  async getCurrentユーザー(): Promise<認証済ユーザー | null> {
    if (typeof window === "undefined") {
      return null;
    }

    const encodedUserId = localStorage.getItem("auth_user_id");
    if (!encodedUserId) {
      return null;
    }

    let userId: string;
    try {
      userId = decodeFromStorage(encodedUserId);
    } catch {
      // Remove corrupt data from localStorage
      localStorage.removeItem("auth_user_id");
      return null;
    }

    const user = this.usersById.get(userId);
    return user ? to認証済ユーザー(user) : null;
  }

  async logout(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem("auth_user_id");
  }

  onAuthStateChange(_callback: (user: 認証済ユーザー | null) => void): () => void {
    // For in-memory repository, we don't have real-time auth state changes
    // We'll check on initialization and after login/logout
    // Return a no-op unsubscribe function
    return () => {
      // No-op
    };
  }
}

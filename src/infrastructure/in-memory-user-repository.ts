import {
  UserRepository,
  User,
  AuthenticatedUser,
  toAuthenticatedUser,
  STOCK_GROUP_NAMES,
  ROLES,
} from "@/domain";
import { logger } from "@/utils/logger";
import { StockGroupName } from "@/domain/models/stock";

// User data with passwords for in-memory repository (used in preview environments)
// These match the users created by the create-users script (ADR 0003)
const INITIAL_USER_DATA = [
  {
    id: "user-maiwashi-primary-id",
    email: "maiwashi-primary@example.com",
    password: "maiwashi-primary123",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: ROLES.PRIMARY,
    },
  },
  {
    id: "user-maiwashi-secondary-id",
    email: "maiwashi-secondary@example.com",
    password: "maiwashi-secondary123",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: ROLES.SECONDARY,
    },
  },
  {
    id: "user-zuwaigani-primary-id",
    email: "zuwaigani-primary@example.com",
    password: "zuwaigani-primary123",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: ROLES.PRIMARY,
    },
  },
  {
    id: "user-zuwaigani-secondary-id",
    email: "zuwaigani-secondary@example.com",
    password: "zuwaigani-secondary123",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: ROLES.SECONDARY,
    },
  },
  {
    id: "user-admin-id",
    email: "admin@example.com",
    password: "admin123",
    // Admin has "管理者" role for all stock groups
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: ROLES.ADMIN,
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: ROLES.ADMIN,
    },
  },
] as const;

export class InMemoryUserRepository implements UserRepository {
  private usersById: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private passwordsByEmail: Map<string, string> = new Map();

  constructor() {
    // Initialize with default users
    for (const userData of INITIAL_USER_DATA) {
      const user: User = {
        id: userData.id,
        email: userData.email,
        rolesByStockGroup: userData.rolesByStockGroup,
      };
      this.usersById.set(user.id, user);
      this.usersByEmail.set(user.email, user);
      this.passwordsByEmail.set(user.email, userData.password);
    }
  }

  async authenticate(email: string, password: string): Promise<AuthenticatedUser | null> {
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

      // Store user ID in localStorage for session persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user_id", user.id);
      }

      logger.debug("authenticate completed", { userId: user.id, email });
      return toAuthenticatedUser(user);
    } catch (error) {
      logger.error("authenticate failed", { email }, error as Error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.usersById.get(id);
  }

  async findByStockGroupName(stockGroupName: StockGroupName): Promise<User[]> {
    return Array.from(this.usersById.values()).filter(
      (user) => user.rolesByStockGroup[stockGroupName] !== undefined
    );
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    if (typeof window === "undefined") {
      return null;
    }

    const storedUserId = localStorage.getItem("auth_user_id");
    if (!storedUserId) {
      return null;
    }

    const user = this.usersById.get(storedUserId);
    return user ? toAuthenticatedUser(user) : null;
  }

  async logout(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem("auth_user_id");
  }

  onAuthStateChange(_callback: (user: AuthenticatedUser | null) => void): () => void {
    // For in-memory repository, we don't have real-time auth state changes
    // We'll check on initialization and after login/logout
    // Return a no-op unsubscribe function
    return () => {
      // No-op
    };
  }
}

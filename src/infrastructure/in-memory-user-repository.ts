import {
  UserRepository,
  User,
  STOCK_GROUP_NAMES,
  USER_ROLES,
  StockGroupName,
} from "@/domain";

// Initial users for in-memory repository (used in preview environments)
// These match the users created by the create-users script (ADR 0003)
const INITIAL_USERS: User[] = [
  {
    id: "user-maiwashi-primary-id",
    email: "maiwashi-primary@example.com",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: USER_ROLES.PRIMARY,
    },
  },
  {
    id: "user-maiwashi-secondary-id",
    email: "maiwashi-secondary@example.com",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: USER_ROLES.SECONDARY,
    },
  },
  {
    id: "user-zuwaigani-primary-id",
    email: "zuwaigani-primary@example.com",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: USER_ROLES.PRIMARY,
    },
  },
  {
    id: "user-zuwaigani-secondary-id",
    email: "zuwaigani-secondary@example.com",
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: USER_ROLES.SECONDARY,
    },
  },
  {
    id: "user-admin-id",
    email: "admin@example.com",
    // Admin has "管理者" role for all stock groups
    rolesByStockGroup: {
      [STOCK_GROUP_NAMES.MAIWASHI_PACIFIC]: USER_ROLES.ADMIN,
      [STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK]: USER_ROLES.ADMIN,
    },
  },
];

export class InMemoryUserRepository implements UserRepository {
  private usersById: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();

  constructor() {
    // Initialize with default users
    for (const user of INITIAL_USERS) {
      this.usersById.set(user.id, user);
      this.usersByEmail.set(user.email, user);
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
}


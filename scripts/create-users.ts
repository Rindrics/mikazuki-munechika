// Use only for local development
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Please set it in .env.local file.");
}

if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Get it from 'supabase status' output and set it in .env.local file."
  );
}

// Validate JWT format (basic check)
if (!supabaseServiceKey.includes(".")) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY appears to be invalid. It should be a JWT token (contains dots).\n" +
      "Get the correct service_role key from 'supabase status' output."
  );
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// User data to create (ADR 0003: role and stock group design)
const users = [
  {
    email: "maiwashi-primary@example.com",
    password: "maiwashi-primary123",
    担当資源名: "マイワシ太平洋系群",
    role: "主担当" as const,
  },
  {
    email: "maiwashi-secondary@example.com",
    password: "maiwashi-secondary123",
    担当資源名: "マイワシ太平洋系群",
    role: "副担当" as const,
  },
  {
    email: "zuwaigani-primary@example.com",
    password: "zuwaigani-primary123",
    担当資源名: "ズワイガニオホーツク海系群",
    role: "主担当" as const,
  },
  {
    email: "zuwaigani-secondary@example.com",
    password: "zuwaigani-secondary123",
    担当資源名: "ズワイガニオホーツク海系群",
    role: "副担当" as const,
  },
  {
    email: "admin@example.com",
    password: "admin123",
    role: "管理者" as const,
    // Admin role: will be assigned to all stock groups automatically
  },
  // User with multiple roles across different stock groups
  {
    email: "multiple@example.com",
    password: "multiple123",
    担当資源名: "マイワシ太平洋系群",
    role: "主担当" as const,
  },
  {
    email: "multiple@example.com",
    password: "multiple123",
    担当資源名: "マイワシ対馬暖流系群",
    role: "副担当" as const,
  },
  {
    email: "multiple@example.com",
    password: "multiple123",
    担当資源名: "マチ類（奄美諸島・沖縄諸島・先島諸島）",
    role: "主担当" as const,
  },
];

async function createUsers() {
  console.log("Creating users...");

  // Get stock groups
  const { data: stockGroups, error: stockGroupsError } = await supabase
    .from("stock_groups")
    .select("id, name");

  if (stockGroupsError) {
    throw new Error(`Failed to fetch stock groups: ${stockGroupsError.message}`);
  }

  if (!stockGroups || stockGroups.length === 0) {
    throw new Error(
      "No stock groups found. Please run migrations first (supabase db reset or supabase migration up)."
    );
  }

  const stockGroupMap = new Map(stockGroups.map((sg) => [sg.name, sg.id]));

  for (const userData of users) {
    try {
      // For 管理者, assign to all stock groups
      const stockGroupsToAssign =
        userData.role === "管理者"
          ? Array.from(stockGroupMap.values())
          : userData.担当資源名
            ? [stockGroupMap.get(userData.担当資源名)].filter(
                (id): id is string => id !== undefined
              )
            : [];

      if (stockGroupsToAssign.length === 0) {
        if (userData.role !== "管理者") {
          console.error(
            `Stock group "${userData.担当資源名}" not found, skipping user ${userData.email}`
          );
        }
        continue;
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((u) => u.email === userData.email);

      if (existingUser) {
        console.log(`User ${userData.email} already exists, updating roles...`);

        // Assign roles to all stock groups (for admin) or specific stock group
        for (const stockGroupId of stockGroupsToAssign) {
          // Check if role already exists
          const { data: existingRoles } = await supabase
            .from("user_stock_group_roles")
            .select("*")
            .eq("user_id", existingUser.id)
            .eq("stock_group_id", stockGroupId)
            .eq("role", userData.role);

          if (existingRoles && existingRoles.length > 0) {
            console.log(
              `Role already exists for ${userData.email} in stock group ${stockGroupId}, skipping...`
            );
            continue;
          }

          // Create user role
          const { error: roleError } = await supabase.from("user_stock_group_roles").insert({
            user_id: existingUser.id,
            stock_group_id: stockGroupId,
            role: userData.role,
          });

          if (roleError) {
            console.error(
              `Error creating role for ${userData.email} in stock group ${stockGroupId}:`,
              roleError.message
            );
          } else {
            const stockGroupName = Array.from(stockGroupMap.entries()).find(
              ([_, id]) => id === stockGroupId
            )?.[0];
            console.log(
              `Role created for ${userData.email}: ${userData.role} for ${stockGroupName || stockGroupId}`
            );
          }
        }
        continue;
      }

      // Create user using admin API
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email for local development
      });

      if (userError) {
        console.error(`Error creating user ${userData.email}:`, userError.message);
        continue;
      }

      if (!newUser.user) {
        console.error(`Failed to create user ${userData.email}`);
        continue;
      }

      console.log(`User ${userData.email} created with ID: ${newUser.user.id}`);

      // Assign roles to all stock groups (for admin) or specific stock group
      for (const stockGroupId of stockGroupsToAssign) {
        const { error: roleError } = await supabase.from("user_stock_group_roles").insert({
          user_id: newUser.user.id,
          stock_group_id: stockGroupId,
          role: userData.role,
        });

        if (roleError) {
          console.error(
            `Error creating role for ${userData.email} in stock group ${stockGroupId}:`,
            roleError.message
          );
        } else {
          const stockGroupName = Array.from(stockGroupMap.entries()).find(
            ([_, id]) => id === stockGroupId
          )?.[0];
          console.log(
            `Role created for ${userData.email}: ${userData.role} for ${stockGroupName || stockGroupId}`
          );
        }
      }
    } catch (error) {
      console.error(`Unexpected error for ${userData.email}:`, error);
    }
  }

  console.log("User creation completed!");
}

createUsers().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

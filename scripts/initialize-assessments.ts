// Initialize stock assessments for a specific fiscal year
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

// Fiscal year to initialize (default: 2025)
const FISCAL_YEAR = 2025;

async function initializeAssessments() {
  console.log(`\n📊 Initializing stock assessments for fiscal year ${FISCAL_YEAR}...\n`);

  // Get all stock groups
  const { data: stockGroups, error: stockGroupsError } = await supabase
    .from("stock_groups")
    .select("id, name")
    .order("name");

  if (stockGroupsError) {
    console.error("❌ Failed to fetch stock groups:", stockGroupsError.message);
    process.exit(1);
  }

  if (!stockGroups || stockGroups.length === 0) {
    console.log("⚠️  No stock groups found in database.");
    console.log("   Please run seed migration first.");
    process.exit(1);
  }

  console.log(`Found ${stockGroups.length} stock groups:\n`);
  stockGroups.forEach((sg) => {
    console.log(`  - ${sg.name}`);
  });
  console.log();

  // Check existing assessments for this fiscal year
  const { data: existingAssessments, error: existingError } = await supabase
    .from("stock_assessments")
    .select("id, stock_group_id")
    .eq("fiscal_year", FISCAL_YEAR);

  if (existingError) {
    console.error("❌ Failed to check existing assessments:", existingError.message);
    process.exit(1);
  }

  const existingStockGroupIds = new Set(existingAssessments?.map((a) => a.stock_group_id) || []);

  // Filter stock groups that don't have assessments yet
  const stockGroupsToInitialize = stockGroups.filter((sg) => !existingStockGroupIds.has(sg.id));

  if (stockGroupsToInitialize.length === 0) {
    console.log(`✅ All stock groups already have assessments for fiscal year ${FISCAL_YEAR}.`);
    return;
  }

  console.log(`Initializing ${stockGroupsToInitialize.length} assessments...\n`);

  // Create assessments for each stock group
  const assessments = stockGroupsToInitialize.map((sg) => ({
    stock_group_id: sg.id,
    fiscal_year: FISCAL_YEAR,
    status: "未着手",
    origin_status: null,
  }));

  const { error: insertError } = await supabase.from("stock_assessments").insert(assessments);

  if (insertError) {
    console.error("❌ Failed to initialize assessments:", insertError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully initialized ${stockGroupsToInitialize.length} assessments:\n`);
  stockGroupsToInitialize.forEach((sg) => {
    console.log(`  ✓ ${sg.name} → 未着手`);
  });

  // Show summary
  console.log(`\n📋 Summary for fiscal year ${FISCAL_YEAR}:`);
  console.log(`   - Total stock groups: ${stockGroups.length}`);
  console.log(`   - Already initialized: ${existingStockGroupIds.size}`);
  console.log(`   - Newly initialized: ${stockGroupsToInitialize.length}`);
}

// Run the script
initializeAssessments()
  .then(() => {
    console.log("\n🎉 Done!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Unexpected error:", error);
    process.exit(1);
  });

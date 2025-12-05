import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Get it from 'supabase status' output."
  );
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function toggleMaintenanceMode(enable: boolean) {
  const { data, error } = await supabase
    .from("system_settings")
    .update({
      value: enable ? true : false,
      updated_at: new Date().toISOString(),
    })
    .eq("key", "maintenance_mode")
    .select()
    .single();

  if (error) {
    console.error("Error toggling maintenance mode:", error.message);
    process.exit(1);
  }

  console.log(
    `Maintenance mode ${enable ? "enabled" : "disabled"} successfully`
  );
  console.log(`Current value: ${data.value}`);
}

// Get command line argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/toggle-maintenance-mode.ts [enable|disable]");
  process.exit(1);
}

const command = args[0].toLowerCase();
if (command !== "enable" && command !== "disable") {
  console.error("Error: Command must be 'enable' or 'disable'");
  process.exit(1);
}

toggleMaintenanceMode(command === "enable").catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

import type { 資源評価Repository } from "@/domain/repositories";
import { Supabase資源評価Repository } from "./supabase-assessment-repository";
import { getSupabaseClient } from "./supabase-client";

/**
 * Create assessment repository instance
 * Uses Supabase implementation for client-side
 */
export function create資源評価Repository(): 資源評価Repository {
  const supabase = getSupabaseClient();
  return new Supabase資源評価Repository(supabase);
}

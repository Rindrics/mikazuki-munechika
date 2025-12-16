import type { 資源評価Repository } from "@/domain/repositories";
import { Supabase資源評価Repository } from "./supabase-assessment-repository";
import { getSupabaseServerClient } from "./supabase-server-client";

/**
 * Create assessment repository instance for server-side
 * Uses Supabase server client with cookies for auth
 */
export async function create資源評価RepositoryServer(): Promise<資源評価Repository> {
  const supabase = await getSupabaseServerClient();
  return new Supabase資源評価Repository(supabase);
}

import { ユーザーRepository } from "@/domain";
import { InMemoryユーザーRepository } from "./in-memory-user-repository";
import { SupabaseユーザーRepository } from "./supabase-user-repository";

export function createユーザーRepository(): ユーザーRepository {
  const useInMemory =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY === "true"
      : process.env.USE_IN_MEMORY_REPOSITORY === "true";

  if (useInMemory) {
    return new InMemoryユーザーRepository();
  }

  return new SupabaseユーザーRepository();
}

import { UserRepository } from "@/domain";
import { InMemoryUserRepository } from "./in-memory-user-repository";
import { SupabaseUserRepository } from "./supabase-user-repository";

export function createUserRepository(): UserRepository {
  const useInMemory =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY === "true"
      : process.env.USE_IN_MEMORY_REPOSITORY === "true";

  if (useInMemory) {
    return new InMemoryUserRepository();
  }

  return new SupabaseUserRepository();
}

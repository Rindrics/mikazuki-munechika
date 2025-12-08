import { AssessmentResultRepository } from "@/domain";
import { InMemoryAssessmentResultRepository } from "./in-memory-assessment-result-repository";
import { SupabaseAssessmentResultRepository } from "./supabase-assessment-result-repository";

export function createAssessmentResultRepository(): AssessmentResultRepository {
  const useInMemory =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_USE_IN_MEMORY_REPOSITORY === "true"
      : process.env.USE_IN_MEMORY_REPOSITORY === "true";

  if (useInMemory) {
    return new InMemoryAssessmentResultRepository();
  }

  return new SupabaseAssessmentResultRepository();
}

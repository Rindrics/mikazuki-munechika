import { AssessmentResultRepository, AcceptableBiologicalCatch } from "@/domain";
import { logger } from "@/utils/logger";

// Dynamic import to avoid bundling server-only code in client components
async function getServerClient() {
  const { getSupabaseServerClient } = await import("./supabase-server-client");
  return getSupabaseServerClient();
}

export class SupabaseAssessmentResultRepository implements AssessmentResultRepository {
  async findByStockName(stockName: string): Promise<AcceptableBiologicalCatch | undefined> {
    logger.debug("findByStockName called", { stockName });

    const supabase = await getServerClient();

    // Join with stock_groups to query by name while using stock_group_id internally
    const { data, error } = await supabase
      .from("assessment_results")
      .select(
        `
        value,
        stock_groups!inner(name)
      `
      )
      .eq("stock_groups.name", stockName)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        logger.debug("findByStockName: no result found", { stockName });
        return undefined;
      }
      logger.error("findByStockName failed", { stockName }, error);
      throw error;
    }

    logger.debug("findByStockName completed", { stockName, value: data.value });
    return { value: data.value };
  }

  async save(stockName: string, result: AcceptableBiologicalCatch): Promise<void> {
    logger.debug("save called", { stockName, value: result.value });

    const supabase = await getServerClient();

    // Debug: Check current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    logger.debug("Current user in save", { userId: user?.id, email: user?.email });

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await supabase
      .from("stock_groups")
      .select("id")
      .eq("name", stockName)
      .single();

    if (stockGroupError || !stockGroup) {
      logger.error("save failed: stock group not found", { stockName }, stockGroupError);
      throw new Error(`Stock group not found: ${stockName}`);
    }

    const { error } = await supabase.from("assessment_results").insert({
      stock_group_id: stockGroup.id,
      value: result.value,
    });

    if (error) {
      logger.error("save failed", { stockName, stockGroupId: stockGroup.id }, error);
      throw error;
    }

    logger.debug("save completed", { stockName, stockGroupId: stockGroup.id });
  }
}

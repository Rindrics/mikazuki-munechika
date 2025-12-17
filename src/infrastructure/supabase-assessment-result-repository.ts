import {
  AssessmentResultRepository,
  ABC算定結果,
  VersionedAssessmentResult,
  AssessmentParameters,
} from "@/domain";
import { logger } from "@/utils/logger";

// Dynamic import to avoid bundling server-only code in client components
async function getServerClient() {
  const { getSupabaseServerClient } = await import("./supabase-server-client");
  return getSupabaseServerClient();
}

export class SupabaseAssessmentResultRepository implements AssessmentResultRepository {
  /**
   * @deprecated Use findByStockNameAndFiscalYear instead
   */
  async findByStockName(stockName: string): Promise<ABC算定結果 | undefined> {
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

  async findByStockNameAndFiscalYear(
    stockName: string,
    fiscalYear: number
  ): Promise<VersionedAssessmentResult[]> {
    logger.debug("findByStockNameAndFiscalYear called", { stockName, fiscalYear });

    const supabase = await getServerClient();

    const { data, error } = await supabase
      .from("assessment_results")
      .select(
        `
        version,
        fiscal_year,
        value,
        parameters,
        created_at,
        stock_groups!inner(name)
      `
      )
      .eq("stock_groups.name", stockName)
      .eq("fiscal_year", fiscalYear)
      .order("version", { ascending: false });

    if (error) {
      logger.error("findByStockNameAndFiscalYear failed", { stockName, fiscalYear }, error);
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug("findByStockNameAndFiscalYear: no results found", { stockName, fiscalYear });
      return [];
    }

    return data.map((row) => ({
      version: row.version,
      fiscalYear: row.fiscal_year,
      result: { value: row.value },
      parameters: row.parameters as AssessmentParameters | undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  async findByStockNameAndVersion(
    stockName: string,
    fiscalYear: number,
    version: number
  ): Promise<VersionedAssessmentResult | undefined> {
    logger.debug("findByStockNameAndVersion called", { stockName, fiscalYear, version });

    const supabase = await getServerClient();

    const { data, error } = await supabase
      .from("assessment_results")
      .select(
        `
        version,
        fiscal_year,
        value,
        parameters,
        created_at,
        stock_groups!inner(name)
      `
      )
      .eq("stock_groups.name", stockName)
      .eq("fiscal_year", fiscalYear)
      .eq("version", version)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        logger.debug("findByStockNameAndVersion: not found", { stockName, fiscalYear, version });
        return undefined;
      }
      logger.error("findByStockNameAndVersion failed", { stockName, fiscalYear, version }, error);
      throw error;
    }

    return {
      version: data.version,
      fiscalYear: data.fiscal_year,
      result: { value: data.value },
      parameters: data.parameters as AssessmentParameters | undefined,
      createdAt: new Date(data.created_at),
    };
  }

  async getNextVersion(stockName: string, fiscalYear: number): Promise<number> {
    logger.debug("getNextVersion called", { stockName, fiscalYear });

    const supabase = await getServerClient();

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await supabase
      .from("stock_groups")
      .select("id")
      .eq("name", stockName)
      .single();

    if (stockGroupError || !stockGroup) {
      logger.error("getNextVersion failed: stock group not found", { stockName }, stockGroupError);
      throw new Error(`Stock group not found: ${stockName}`);
    }

    // Call the database function to get next version
    const { data, error } = await supabase.rpc("get_next_assessment_version", {
      p_stock_group_id: stockGroup.id,
      p_fiscal_year: fiscalYear,
    });

    if (error) {
      logger.error("getNextVersion failed", { stockName, fiscalYear }, error);
      throw error;
    }

    logger.debug("getNextVersion completed", { stockName, fiscalYear, nextVersion: data });
    return data as number;
  }

  /**
   * @deprecated Use saveWithVersion instead
   */
  async save(stockName: string, result: ABC算定結果): Promise<void> {
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

  async saveWithVersion(
    stockName: string,
    fiscalYear: number,
    result: ABC算定結果,
    parameters: AssessmentParameters
  ): Promise<{ version: number; isNew: boolean }> {
    logger.debug("saveWithVersion called", { stockName, fiscalYear, value: result.value });

    const supabase = await getServerClient();

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await supabase
      .from("stock_groups")
      .select("id")
      .eq("name", stockName)
      .single();

    if (stockGroupError || !stockGroup) {
      logger.error("saveWithVersion failed: stock group not found", { stockName }, stockGroupError);
      throw new Error(`Stock group not found: ${stockName}`);
    }

    // Check if same parameters already exist (ADR 0018 - deduplication)
    const { data: existingVersion, error: findError } = await supabase.rpc(
      "find_existing_version_by_params",
      {
        p_stock_group_id: stockGroup.id,
        p_fiscal_year: fiscalYear,
        p_parameters: parameters,
      }
    );

    if (findError) {
      logger.error("saveWithVersion: find_existing_version_by_params failed", { stockName, fiscalYear }, findError);
      throw findError;
    }

    // If same parameters exist, return existing version
    if (existingVersion !== null) {
      logger.info("saveWithVersion: same parameters already exist, returning existing version", {
        stockName,
        fiscalYear,
        existingVersion,
      });
      return { version: existingVersion, isNew: false };
    }

    // Get next version number
    const nextVersion = await this.getNextVersion(stockName, fiscalYear);

    // Insert with version and parameters
    const { error } = await supabase.from("assessment_results").insert({
      stock_group_id: stockGroup.id,
      fiscal_year: fiscalYear,
      version: nextVersion,
      value: result.value,
      parameters: parameters,
    });

    if (error) {
      logger.error(
        "saveWithVersion failed",
        { stockName, fiscalYear, version: nextVersion },
        error
      );
      throw error;
    }

    logger.info("saveWithVersion completed", {
      stockName,
      fiscalYear,
      version: nextVersion,
      isNew: true,
    });

    return { version: nextVersion, isNew: true };
  }
}

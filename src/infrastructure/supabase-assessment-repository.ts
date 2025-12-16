import { SupabaseClient } from "@supabase/supabase-js";
import type { 資源評価Repository, 資源評価ステータス } from "@/domain/repositories";
import type { 資源名 } from "@/domain/models";
import type { 評価ステータス, 再検討前ステータス } from "@/domain/models/stock/status";
import { 資源名s } from "@/domain/constants";
import { logger } from "@/utils/logger";

/**
 * Supabase implementation of 資源評価Repository
 */
export class Supabase資源評価Repository implements 資源評価Repository {
  constructor(private supabase: SupabaseClient) {}

  async findBy資源名And年度(資源名: 資源名, 年度: number): Promise<資源評価ステータス | undefined> {
    logger.debug("findBy資源名And年度 called", { 資源名, 年度 });

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await this.supabase
      .from("stock_groups")
      .select("id")
      .eq("name", 資源名)
      .single();

    if (stockGroupError || !stockGroup) {
      logger.debug("Stock group not found", { 資源名 });
      return undefined;
    }

    // Get assessment
    const { data: assessment, error } = await this.supabase
      .from("stock_assessments")
      .select("status, origin_status")
      .eq("stock_group_id", stockGroup.id)
      .eq("fiscal_year", 年度)
      .single();

    if (error || !assessment) {
      logger.debug("Assessment not found", { 資源名, 年度 });
      return undefined;
    }

    return {
      資源名,
      年度,
      ステータス: assessment.status as 評価ステータス,
      元ステータス: assessment.origin_status as 再検討前ステータス | undefined,
    };
  }

  async findBy年度(年度: number): Promise<資源評価ステータス[]> {
    logger.debug("findBy年度 called", { 年度 });

    const { data: assessments, error } = await this.supabase
      .from("stock_assessments")
      .select(
        `
        status,
        origin_status,
        stock_groups!inner(name)
      `
      )
      .eq("fiscal_year", 年度);

    if (error || !assessments) {
      logger.error("Failed to fetch assessments", { 年度 }, error as Error);
      return [];
    }

    return assessments.map((a) => {
      // Handle Supabase JOIN result type (can be array or object)
      const stockGroups = a.stock_groups;
      let stockName: 資源名;
      if (Array.isArray(stockGroups) && stockGroups.length > 0) {
        stockName = stockGroups[0].name as 資源名;
      } else if (stockGroups && typeof stockGroups === "object" && "name" in stockGroups) {
        stockName = (stockGroups as { name: string }).name as 資源名;
      } else {
        throw new Error("Invalid stock_groups data in assessment");
      }

      return {
        資源名: stockName,
        年度,
        ステータス: a.status as 評価ステータス,
        元ステータス: a.origin_status as 再検討前ステータス | undefined,
      };
    });
  }

  async save(assessment: 資源評価ステータス): Promise<void> {
    logger.debug("save called", { assessment });

    // Get stock_group_id from name
    const { data: stockGroup, error: stockGroupError } = await this.supabase
      .from("stock_groups")
      .select("id")
      .eq("name", assessment.資源名)
      .single();

    if (stockGroupError || !stockGroup) {
      throw new Error(`Stock group not found: ${assessment.資源名}`);
    }

    // Upsert assessment
    const { error } = await this.supabase.from("stock_assessments").upsert(
      {
        stock_group_id: stockGroup.id,
        fiscal_year: assessment.年度,
        status: assessment.ステータス,
        origin_status: assessment.元ステータス || null,
      },
      {
        onConflict: "stock_group_id,fiscal_year",
      }
    );

    if (error) {
      logger.error("Failed to save assessment", { assessment }, error as Error);
      throw new Error(`Failed to save assessment: ${error.message}`);
    }

    logger.info("Assessment saved", { assessment });
  }

  async initialize年度(年度: number): Promise<void> {
    logger.debug("initialize年度 called", { 年度 });

    // Get all stock groups
    const { data: stockGroups, error: stockGroupsError } = await this.supabase
      .from("stock_groups")
      .select("id, name");

    if (stockGroupsError || !stockGroups) {
      throw new Error(`Failed to fetch stock groups: ${stockGroupsError?.message}`);
    }

    // Filter to only known stock names
    const knownStockNames = new Set(Object.values(資源名s));
    const validStockGroups = stockGroups.filter((sg) => knownStockNames.has(sg.name as 資源名));

    // Create initial assessments for each stock group
    const assessments = validStockGroups.map((sg) => ({
      stock_group_id: sg.id,
      fiscal_year: 年度,
      status: "未着手",
      origin_status: null,
    }));

    const { error } = await this.supabase
      .from("stock_assessments")
      .upsert(assessments, { onConflict: "stock_group_id,fiscal_year" });

    if (error) {
      logger.error("Failed to initialize fiscal year", { 年度 }, error as Error);
      throw new Error(`Failed to initialize fiscal year: ${error.message}`);
    }

    logger.info("Fiscal year initialized", { 年度, count: assessments.length });
  }
}

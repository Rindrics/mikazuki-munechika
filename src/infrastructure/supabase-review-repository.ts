/**
 * @module infrastructure/supabase-review-repository
 * 査読用資源評価リポジトリの Supabase 実装
 *
 * @see ADR 0030 for design rationale
 */

import type { 資源名 } from "@/domain/models/stock/stock/model";
import type { 当年までの資源計算結果 } from "@/domain/models/stock/calculation/strategy";
import type { 査読用資源評価, 査読用資源評価Repository } from "@/domain/models/review";
import { logger } from "@/utils/logger";

// Dynamic import to avoid bundling server-only code in client components
async function getServerClient() {
  const { getSupabaseServerClient } = await import("./supabase-server-client");
  return getSupabaseServerClient();
}

/**
 * Database row type for reviews table
 */
interface ReviewRow {
  id: string;
  reviewer_id: string;
  stock_name: string;
  fiscal_year: number;
  calculation_result: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to domain model
 */
function toDomain(row: ReviewRow): 査読用資源評価 {
  return {
    id: row.id,
    査読者ID: row.reviewer_id,
    対象資源: row.stock_name as 資源名,
    評価年度: row.fiscal_year,
    資源計算結果: row.calculation_result as 当年までの資源計算結果,
  };
}

/**
 * Supabase implementation of 査読用資源評価Repository
 */
export class SupabaseReviewRepository implements 査読用資源評価Repository {
  async save(評価: 査読用資源評価): Promise<void> {
    logger.debug("SupabaseReviewRepository.save called", {
      id: 評価.id,
      査読者ID: 評価.査読者ID,
      対象資源: 評価.対象資源,
      評価年度: 評価.評価年度,
    });

    const supabase = await getServerClient();

    // Upsert to handle both insert and update
    const { error } = await supabase.from("reviews").upsert(
      {
        id: 評価.id,
        reviewer_id: 評価.査読者ID,
        stock_name: 評価.対象資源,
        fiscal_year: 評価.評価年度,
        calculation_result: 評価.資源計算結果,
      },
      {
        onConflict: "reviewer_id,stock_name,fiscal_year",
      }
    );

    if (error) {
      logger.error("SupabaseReviewRepository.save failed", { 評価 }, error);
      throw error;
    }

    logger.debug("SupabaseReviewRepository.save completed", { id: 評価.id });
  }

  async findBy査読者ID(査読者ID: string): Promise<査読用資源評価[]> {
    logger.debug("SupabaseReviewRepository.findBy査読者ID called", { 査読者ID });

    const supabase = await getServerClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewer_id", 査読者ID)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error("SupabaseReviewRepository.findBy査読者ID failed", { 査読者ID }, error);
      throw error;
    }

    const results = (data ?? []).map(toDomain);
    logger.debug("SupabaseReviewRepository.findBy査読者ID completed", {
      査読者ID,
      count: results.length,
    });

    return results;
  }

  async findBy査読者IDAndResource(
    査読者ID: string,
    資源名: 資源名,
    年度: number
  ): Promise<査読用資源評価 | undefined> {
    logger.debug("SupabaseReviewRepository.findBy査読者IDAndResource called", {
      査読者ID,
      資源名,
      年度,
    });

    const supabase = await getServerClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewer_id", 査読者ID)
      .eq("stock_name", 資源名)
      .eq("fiscal_year", 年度)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        logger.debug("SupabaseReviewRepository.findBy査読者IDAndResource: not found", {
          査読者ID,
          資源名,
          年度,
        });
        return undefined;
      }
      logger.error(
        "SupabaseReviewRepository.findBy査読者IDAndResource failed",
        { 査読者ID, 資源名, 年度 },
        error
      );
      throw error;
    }

    const result = toDomain(data);
    logger.debug("SupabaseReviewRepository.findBy査読者IDAndResource completed", {
      査読者ID,
      資源名,
      年度,
      id: result.id,
    });

    return result;
  }

  async findById(id: string): Promise<査読用資源評価 | undefined> {
    logger.debug("SupabaseReviewRepository.findById called", { id });

    const supabase = await getServerClient();

    const { data, error } = await supabase.from("reviews").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        logger.debug("SupabaseReviewRepository.findById: not found", { id });
        return undefined;
      }
      logger.error("SupabaseReviewRepository.findById failed", { id }, error);
      throw error;
    }

    const result = toDomain(data);
    logger.debug("SupabaseReviewRepository.findById completed", { id });

    return result;
  }

  async delete(id: string): Promise<void> {
    logger.debug("SupabaseReviewRepository.delete called", { id });

    const supabase = await getServerClient();

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      logger.error("SupabaseReviewRepository.delete failed", { id }, error);
      throw error;
    }

    logger.debug("SupabaseReviewRepository.delete completed", { id });
  }

  async deleteBy査読者ID(査読者ID: string): Promise<void> {
    logger.debug("SupabaseReviewRepository.deleteBy査読者ID called", { 査読者ID });

    const supabase = await getServerClient();

    const { error } = await supabase.from("reviews").delete().eq("reviewer_id", 査読者ID);

    if (error) {
      logger.error("SupabaseReviewRepository.deleteBy査読者ID failed", { 査読者ID }, error);
      throw error;
    }

    logger.debug("SupabaseReviewRepository.deleteBy査読者ID completed", { 査読者ID });
  }
}

/**
 * Factory function to create a review repository
 */
export function createReviewRepository(): 査読用資源評価Repository {
  return new SupabaseReviewRepository();
}

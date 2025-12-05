import { FisheryStock, CatchData, BiologicalData, AcceptableBiologicalCatch } from "@/domain";
import { logger } from "@/utils/logger";

export function calculateAbc(
  stock: FisheryStock,
  catchData: CatchData,
  biologicalData: BiologicalData
): AcceptableBiologicalCatch {
  logger.debug("calculateAbc called", { stockId: stock.id });
  
  const result = stock.estimateAbundance(catchData, biologicalData).assess();
  
  logger.debug("calculateAbc completed", { result: result.value });
  return result;
}

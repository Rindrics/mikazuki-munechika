import { FisheryStock, CatchData, BiologicalData, AcceptableBiologicalCatch } from "@/domain";
import { withLogger } from "@/utils/logger";

function calculateAbcImpl(
  stock: FisheryStock,
  catchData: CatchData,
  biologicalData: BiologicalData
): AcceptableBiologicalCatch {
  return stock.estimateAbundance(catchData, biologicalData).assess();
}

export const calculateAbc = withLogger("calculate-abc", calculateAbcImpl);

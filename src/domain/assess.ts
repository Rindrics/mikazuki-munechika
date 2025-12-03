import {
  AcceptableBiologicalCatch,
  BiologicalData,
  CatchData,
  FisheryStock,
} from "./models";

/**
 * Domain service for assessing fishery stocks.
 * This function delegates the assessment to the stock's own assess method,
 * which implements the appropriate strategy based on the stock type.
 */
export function assess(
  fisheryStock: FisheryStock,
): AcceptableBiologicalCatch {
  return fisheryStock.assess();
}

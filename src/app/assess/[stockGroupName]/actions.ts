"use server";

import { calculateAbc } from "@/application";
import {
  AcceptableBiologicalCatch,
  CatchData,
  BiologicalData,
  StockGroupName,
  createStockGroup,
  createFisheryStock,
} from "@/domain";

export async function calculateAbcAction(
  stockGroupName: StockGroupName,
  catchDataValue: string,
  biologicalDataValue: string
): Promise<AcceptableBiologicalCatch> {
  const stockGroup = createStockGroup(stockGroupName);
  const stock = createFisheryStock(stockGroup);

  const catchData: CatchData = { value: catchDataValue };
  const biologicalData: BiologicalData = { value: biologicalDataValue };

  return calculateAbc(stock, catchData, biologicalData);
}

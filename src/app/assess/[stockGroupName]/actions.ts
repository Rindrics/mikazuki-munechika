"use server";

import { calculateAbc } from "@/application";
import {
  AcceptableBiologicalCatch,
  CatchData,
  BiologicalData,
  StockGroupName,
  createStockGroup,
  createType1Stock,
} from "@/domain";

export async function calculateAbcAction(
  stockGroupName: StockGroupName,
  catchDataValue: string,
  biologicalDataValue: string
): Promise<AcceptableBiologicalCatch> {
  const stockGroup = createStockGroup(stockGroupName);
  // TODO: Determine stock type based on stockGroupName
  const stock = createType1Stock(stockGroup);

  const catchData: CatchData = { value: catchDataValue };
  const biologicalData: BiologicalData = { value: biologicalDataValue };

  return calculateAbc(stock, catchData, biologicalData);
}

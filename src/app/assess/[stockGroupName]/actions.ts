"use server";

import { calculateAbc, SaveAssessmentResultService } from "@/application";
import {
  AcceptableBiologicalCatch,
  CatchData,
  BiologicalData,
  StockGroupName,
  createStockGroup,
  createFisheryStock,
} from "@/domain";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";

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

export async function saveAssessmentResultAction(
  stockGroupName: StockGroupName,
  result: AcceptableBiologicalCatch
): Promise<void> {
  const stockGroup = createStockGroup(stockGroupName);
  const stock = createFisheryStock(stockGroup);

  const repository = createAssessmentResultRepository();
  const service = new SaveAssessmentResultService(repository);

  await service.execute(stock, result);
}

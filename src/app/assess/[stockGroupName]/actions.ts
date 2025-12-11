"use server";

import { ABC算定, SaveAssessmentResultService } from "@/application";
import {
  ABC算定結果,
  漁獲量データ,
  生物学的データ,
  資源名,
  create資源情報,
  create資源評価,
} from "@/domain";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";

export async function calculateAbcAction(
  stockGroupName: 資源名,
  catchDataValue: string,
  biologicalDataValue: string
): Promise<ABC算定結果> {
  const stockGroup = create資源情報(stockGroupName);
  const stock = create資源評価(stockGroup);

  const catchData: 漁獲量データ = { value: catchDataValue };
  const biologicalData: 生物学的データ = { value: biologicalDataValue };

  return ABC算定(stock, catchData, biologicalData);
}

export async function saveAssessmentResultAction(
  stockGroupName: 資源名,
  result: ABC算定結果
): Promise<void> {
  const stockGroup = create資源情報(stockGroupName);
  const stock = create資源評価(stockGroup);

  const repository = createAssessmentResultRepository();
  const service = new SaveAssessmentResultService(repository);

  await service.execute(stock, result);
}

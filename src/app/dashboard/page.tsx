import { GetAssessmentResultsService } from "@/application";
import { InMemoryAssessmentResultRepository } from "@/infrastructure";
import {
  createType1Stock,
  createType2Stock,
  createType3Stock,
  STOCK_GROUP_NAMES,
  createStockGroup,
} from "@/domain";
import { logger } from "@/utils/logger";
import ResultPanel from "./components/ResultPanel";

export default async function Home() {
  logger.info("Loading dashboard page");

  // Initialize repository (in production, this would be injected via DI)
  const repository = new InMemoryAssessmentResultRepository();
  const getAssessmentResultsService = new GetAssessmentResultsService(
    repository
  );

  // Get stocks (in the future, this will be FisheryStock.findAll())
  // Note: stock.name corresponds to stock_groups.name in the database
  const stocks = [
    createType1Stock(createStockGroup(STOCK_GROUP_NAMES.MAIWASHI_PACIFIC)),
    createType2Stock(createStockGroup(STOCK_GROUP_NAMES.ZUWAIGANI_OKHOTSK)),
    createType3Stock(createStockGroup("3 系資源サンプル")), // Test data, not a real stock group
  ];

  // Get assessment results from repository
  const assessmentResults = await getAssessmentResultsService.execute(stocks);

  logger.info("Dashboard page loaded");
  
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="mb-8">資源評価結果一覧</h1>

      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {assessmentResults.map(({ stock, result }, index) => (
          <ResultPanel key={index} stock={stock} result={result} />
        ))}
      </div>
    </main>
  );
}

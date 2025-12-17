import { GetAssessmentResultsService } from "@/application";
import { InMemoryAssessmentResultRepository } from "@/infrastructure";
import { 資源名s, create資源情報, create資源評価, type 資源名 } from "@/domain";
import type { 評価ステータス } from "@/domain/models/stock/status";
import { logger } from "@/utils/logger";
import { create資源評価RepositoryServer } from "@/infrastructure/assessment-repository-server-factory";
import ResultPanel from "./components/ResultPanel";

// Get current fiscal year (April-based fiscal year in Japan)
function getCurrentFiscalYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 4 ? year : year - 1;
}

export default async function Home() {
  logger.info("Loading dashboard page");

  // Initialize repository (in production, this would be injected via DI)
  const repository = new InMemoryAssessmentResultRepository();
  const getAssessmentResultsService = new GetAssessmentResultsService(repository);
  const assessmentStatusRepository = await create資源評価RepositoryServer();

  // Get stocks (in the future, this will be 資源評価.findAll())
  // Note: stock.name corresponds to stock_groups.name in the database
  const stocks = [
    create資源評価(create資源情報(資源名s.マイワシ太平洋)),
    create資源評価(create資源情報(資源名s.ズワイガニオホーツク)),
    create資源評価(create資源情報(資源名s.マチ類)),
  ];

  // Get assessment results from repository
  const assessmentResults = await getAssessmentResultsService.execute(stocks);

  // Get status for each stock
  const 年度 = getCurrentFiscalYear();
  const statusMap = new Map<資源名, 評価ステータス>();
  for (const { stock } of assessmentResults) {
    const stockName = stock.対象.toString() as 資源名;
    const assessment = await assessmentStatusRepository.findBy資源名And年度(stockName, 年度);
    statusMap.set(stockName, assessment?.ステータス ?? "未着手");
  }

  logger.info("Dashboard page loaded");

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="mb-8">資源評価結果一覧</h1>

      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {assessmentResults.map(({ stock, result }, index) => {
          const stockName = stock.対象.toString() as 資源名;
          const status = statusMap.get(stockName) ?? "未着手";
          const isPublished = status === "外部査読中" || status === "外部査読受理済み";
          return (
            <ResultPanel
              key={index}
              stock={stock}
              result={isPublished ? result : undefined}
              isInProgress={!isPublished}
            />
          );
        })}
      </div>
    </main>
  );
}

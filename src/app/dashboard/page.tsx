import { 資源名s, create資源情報, create資源評価, type 資源名, type ABC算定結果 } from "@/domain";
import type { 評価ステータス } from "@/domain/models/stock/status";
import { logger } from "@/utils/logger";
import { create資源評価RepositoryServer } from "@/infrastructure/assessment-repository-server-factory";
import { createAssessmentResultRepository } from "@/infrastructure/assessment-result-repository-factory";
import { getCurrentFiscalYearAction } from "@/app/manage/actions";
import { getPublicationHistoryAction } from "@/app/assess/[stock]/actions";
import ResultPanel from "./components/ResultPanel";

/**
 * Fallback: compute fiscal year from local date (April-based in Japan)
 */
function computeFiscalYearFromDate(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 4 ? year : year - 1;
}

export default async function Home() {
  logger.info("Loading dashboard page");

  // Initialize repositories
  const assessmentStatusRepository = await create資源評価RepositoryServer();
  const assessmentResultRepository = createAssessmentResultRepository();

  // Get stocks (in the future, this will be 資源評価.findAll())
  // Note: stock.name corresponds to stock_groups.name in the database
  const stocks = [
    create資源評価(create資源情報(資源名s.マイワシ太平洋)),
    create資源評価(create資源情報(資源名s.ズワイガニオホーツク)),
    create資源評価(create資源情報(資源名s.マチ類)),
  ];

  // Get current fiscal year from admin settings, with fallback to date-based calculation
  const adminFiscalYear = await getCurrentFiscalYearAction();
  const 年度 = adminFiscalYear ?? computeFiscalYearFromDate();

  // Build assessment data with status and approved version results
  const assessmentData: Array<{
    stock: (typeof stocks)[0];
    status: 評価ステータス;
    result: ABC算定結果 | undefined;
    latestPublishedAt?: Date;
  }> = [];

  for (const stock of stocks) {
    const stockName = stock.対象.toString() as 資源名;
    const assessment = await assessmentStatusRepository.findBy資源名And年度(stockName, 年度);
    const status = assessment?.ステータス ?? "未着手";

    // Published statuses that should show results
    const isPublished = status === "外部査読中" || status === "外部査読受理済み";

    let result: ABC算定結果 | undefined;
    let latestPublishedAt: Date | undefined;

    if (isPublished && assessment?.承諾バージョン) {
      // Get the approved version's result
      const versionedResult = await assessmentResultRepository.findByStockNameAndVersion(
        stockName,
        年度,
        assessment.承諾バージョン
      );
      result = versionedResult?.result;

      // Get latest publication info
      const publications = await getPublicationHistoryAction(stockName);
      if (publications.length > 0) {
        latestPublishedAt = publications[0].publishedAt;
      }
    }

    assessmentData.push({ stock, status, result, latestPublishedAt });
  }

  logger.info("Dashboard page loaded");

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="mb-8">資源評価結果一覧</h1>

      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {assessmentData.map(({ stock, status, result, latestPublishedAt }, index) => {
          const isPublished = status === "外部査読中" || status === "外部査読受理済み";
          return (
            <ResultPanel
              key={index}
              stock={stock}
              result={isPublished ? result : undefined}
              isInProgress={!isPublished}
              publishedAt={latestPublishedAt}
            />
          );
        })}
      </div>
    </main>
  );
}

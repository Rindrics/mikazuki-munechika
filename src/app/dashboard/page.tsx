import { GetAssessmentResultsService } from "@/application";
import { InMemoryAssessmentResultRepository } from "@/infrastructure";
import { Type1Stock, Type2Stock, Type3Stock } from "@/domain";
import ResultPanel from "./components/ResultPanel";

export default async function Home() {
  // Initialize repository (in production, this would be injected via DI)
  const repository = new InMemoryAssessmentResultRepository();
  const getAssessmentResultsService = new GetAssessmentResultsService(
    repository
  );

  // Get stocks (in the future, this will be FisheryStock.findAll())
  const stocks = [
    new Type1Stock("1 系資源サンプル"),
    new Type2Stock("2 系資源サンプル"),
    new Type3Stock("3 系資源サンプル"),
  ];

  // Get assessment results from repository
  const assessmentResults = await getAssessmentResultsService.execute(stocks);

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

import {
  Type1Stock,
  Type2Stock,
  Type3Stock,
  CatchData,
  BiologicalData,
} from "@/domain";
import { calculateAbc }from "@/application";
import ResultPanel from "./components/ResultPanel";

export default function Home() {
  // Sample data for demonstration
  const catchData: CatchData = { value: "漁獲データ 2024" };
  const biologicalData: BiologicalData = { value: "生物データ 2024" };

  // Create sample stocks
  const type1Stock = new Type1Stock("1 系資源サンプル");
  const type2Stock = new Type2Stock("2 系資源サンプル");
  const type3Stock = new Type3Stock("3 系資源サンプル");

  // Assess each stock
  const type1Result = calculateAbc(type1Stock, catchData, biologicalData);
  const type2Result = calculateAbc(type2Stock, catchData, biologicalData);
  const type3Result = calculateAbc(type3Stock, catchData, biologicalData);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="mb-8">資源評価結果一覧</h1>

      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {/* Type 1 Stock */}
        <ResultPanel stock={type1Stock} result={type1Result} />
        <ResultPanel stock={type2Stock} result={type2Result} />
        <ResultPanel stock={type3Stock} result={type3Result} />
      </div>
    </main>
  );
}

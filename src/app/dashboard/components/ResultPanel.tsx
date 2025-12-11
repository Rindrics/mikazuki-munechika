import { 資源評価, ABC算定結果 } from "@/domain";

interface ResultPanelProps {
  stock: 資源評価;
  result: ABC算定結果 | undefined;
}

export default function ResultPanel({ stock, result }: ResultPanelProps) {
  let abundance: string | undefined;
  try {
    abundance = stock.資源量;
  } catch {
    abundance = undefined;
  }

  return (
    <section className="border rounded-lg p-6">
      <h2 className="mb-2">{stock.対象.toString()}</h2>
      <div className="mb-2">
        <strong>資源量:</strong>{" "}
        {abundance ? abundance : <span className="text-gray-500 italic">データ未登録</span>}
      </div>
      <div className="p-4 rounded border">
        <strong className="block mb-2">評価結果:</strong>
        {result ? (
          <div>{result.value}</div>
        ) : (
          <div className="text-gray-500 italic">データ未登録</div>
        )}
      </div>
    </section>
  );
}

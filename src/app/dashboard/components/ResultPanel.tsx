import { FisheryStock, AcceptableBiologicalCatch } from "@/domain";

interface ResultPanelProps {
  stock: FisheryStock;
  result: AcceptableBiologicalCatch;
}

export default function ResultPanel({ stock, result }: ResultPanelProps) {
  return (
    <section className="border rounded-lg p-6">
      <h2 className="mb-2">{stock.name}</h2>
      <div className="mb-2">
        <strong>資源量:</strong> {stock.abundance}
      </div>
      <div className="mb-4">
        <strong>評価方法の参考資料:</strong>{" "}
        <a
          href={stock.reference}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          リンク
        </a>
      </div>
      <div className="p-4 rounded border">
        <strong className="block mb-2">評価結果:</strong>
        <div>{result.value}</div>
      </div>
    </section>
  );
}
import { 資源評価, ABC算定結果 } from "@/domain";

interface ResultPanelProps {
  stock: 資源評価;
  result: ABC算定結果 | undefined;
  isInProgress?: boolean;
  publishedAt?: Date;
}

// Format publication date as yyyy/mm/dd
const publicationDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatPublicationDate(date: Date): string {
  return publicationDateFormatter.format(date);
}

export default function ResultPanel({
  stock,
  result,
  isInProgress = false,
  publishedAt,
}: ResultPanelProps) {
  // Show "評価中" for stocks that are not yet published
  if (isInProgress) {
    return (
      <section className="border rounded-lg p-6 bg-secondary-light/30 dark:bg-secondary-dark/30">
        <h2 className="mb-2">{stock.対象.toString()}</h2>
        <div className="p-4 rounded border bg-background dark:bg-background-dark">
          <p className="text-secondary italic text-center">評価中</p>
        </div>
      </section>
    );
  }

  // Use abundance from result (saved in database)
  const abundance = result?.資源量;

  return (
    <section className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="mb-0">{stock.対象.toString()}</h2>
        {publishedAt && (
          <span className="text-xs px-2 py-0.5 bg-secondary text-white rounded-full">
            公開済み（{formatPublicationDate(publishedAt)}公開版）
          </span>
        )}
      </div>
      <div className="mb-2">
        <strong>資源量:</strong>{" "}
        {abundance ? (
          `${abundance.値} ${abundance.単位}`
        ) : (
          <span className="text-gray-500 italic">データ未登録</span>
        )}
      </div>
      <div className="p-4 rounded border">
        <strong className="block mb-2">評価結果:</strong>
        {result ? (
          <div>
            {result.value} {result.unit}
          </div>
        ) : (
          <div className="text-gray-500 italic">データ未登録</div>
        )}
      </div>
    </section>
  );
}

import { useMemo } from "react";
import type { ABC算定結果 } from "@/domain/data";
import type { AssessmentParameters } from "@/domain/repositories";

interface AssessmentComparisonProps {
  reviewerResult: ABC算定結果 | null;
  publishedResult: ABC算定結果 | null;
  reviewerParams?: { 漁獲データ: string; 生物学的データ: string };
  publishedParams?: AssessmentParameters;
}

export function AssessmentComparison({
  reviewerResult,
  publishedResult,
  reviewerParams,
  publishedParams,
}: AssessmentComparisonProps) {
  // Calculate difference
  const difference = useMemo(() => {
    if (!reviewerResult || !publishedResult) return null;
    const reviewer = parseFloat(reviewerResult.value);
    const published = parseFloat(publishedResult.value);
    if (isNaN(reviewer) || isNaN(published)) return null;
    return reviewer - published;
  }, [reviewerResult, publishedResult]);

  const percentageDiff = useMemo(() => {
    if (!difference || !publishedResult) return null;
    const published = parseFloat(publishedResult.value);
    if (isNaN(published) || published === 0) return null;
    return (difference / published) * 100;
  }, [difference, publishedResult]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Reviewer's Result */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">査読者の計算結果</h3>
          {reviewerResult ? (
            <>
              <p className="text-2xl font-bold mb-2">
                {reviewerResult.value} {reviewerResult.unit}
              </p>
              {reviewerParams && (
                <div className="text-sm text-secondary space-y-1">
                  <p>漁獲データ: {reviewerParams.漁獲データ}</p>
                  <p>生物学的データ: {reviewerParams.生物学的データ}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-secondary italic">計算結果がありません</p>
          )}
        </div>

        {/* Right: Published Result */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900">
          <h3 className="font-medium mb-2">公開された評価結果</h3>
          {publishedResult ? (
            <>
              <p className="text-2xl font-bold mb-2">
                {publishedResult.value} {publishedResult.unit}
              </p>
              {publishedParams && (
                <div className="text-sm text-secondary space-y-1">
                  <p>漁獲データ: {publishedParams.catchData.value}</p>
                  <p>生物学的データ: {publishedParams.biologicalData.value}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-secondary italic">公開データがありません</p>
          )}
        </div>
      </div>

      {/* Difference Display */}
      {difference !== null && (
        <div
          className={`p-4 border rounded-lg ${
            Math.abs(difference) < 0.01
              ? "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700"
              : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700"
          }`}
        >
          <h3 className="font-medium mb-2">差分</h3>
          <p
            className={`text-xl font-bold ${
              Math.abs(difference) < 0.01 ? "text-green-600" : "text-orange-600"
            }`}
          >
            {difference > 0 ? "+" : ""}
            {difference.toFixed(2)} トン
            {percentageDiff !== null && (
              <span className="text-sm ml-2">
                ({percentageDiff > 0 ? "+" : ""}
                {percentageDiff.toFixed(2)}%)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

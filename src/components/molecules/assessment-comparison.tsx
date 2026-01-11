import { useMemo } from "react";
import type { ABC算定結果 } from "@/domain/data";
import type { AssessmentParameters } from "@/domain/repositories";

interface AssessmentComparisonProps {
  reviewerResult: ABC算定結果 | null;
  publishedResult: ABC算定結果 | null;
  publishedParams?: AssessmentParameters;
}

export function AssessmentComparison({
  reviewerResult,
  publishedResult,
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
        {/* Left: Published Result */}
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

        {/* Right: Reviewer's Result */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">査読者の計算結果</h3>
          {reviewerResult ? (
            <>
              <p className="text-2xl font-bold mb-2">
                {reviewerResult.value} {reviewerResult.unit}
              </p>
              {/* Difference Display */}
              {difference !== null && (
                <div
                  className={`mt-4 pt-4 border-t ${
                    Math.abs(difference) < 0.01
                      ? "border-green-200 dark:border-green-700"
                      : "border-yellow-200 dark:border-yellow-700"
                  }`}
                >
                  <p className="text-sm text-secondary mb-1">差分</p>
                  <p
                    className={`text-lg font-bold ${
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
            </>
          ) : (
            <p className="text-secondary italic">計算結果がありません</p>
          )}
        </div>
      </div>
    </div>
  );
}

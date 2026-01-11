"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useCallback, useEffect } from "react";
import AuthModal from "@/components/auth-modal";
import { Button } from "@/components/atoms";
import { AssessmentComparison } from "@/components/molecules";
import {
  parseExcelAction,
  saveReviewAction,
  calculateReviewAbcAction,
  getPublishedAssessmentAction,
  type ParsedDataSummary,
} from "./actions";

/**
 * Parameters for ABC calculation that can be configured by the reviewer
 */
interface ABCCalculationParams {
  F: number;
  M: number;
  β: number;
}

/**
 * Default parameters for ABC calculation
 */
const DEFAULT_ABC_PARAMS: ABCCalculationParams = {
  F: 0.3,
  M: 0.4,
  β: 0.8,
};
import type { ABC算定結果 } from "@/domain/data";
import type { VersionedAssessmentResult } from "@/domain/repositories";

export default function ReviewPage() {
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDataSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ABC calculation state
  const [abcResult, setAbcResult] = useState<ABC算定結果 | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [abcParams, setAbcParams] = useState<ABCCalculationParams>(DEFAULT_ABC_PARAMS);

  // Published assessment comparison state
  const [publishedAssessment, setPublishedAssessment] = useState<VersionedAssessmentResult | null>(
    null
  );
  const [isFetchingPublished, setIsFetchingPublished] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-calculate ABC when parameters change
  useEffect(() => {
    if (!file || !parsedData) return;

    const calculate = async () => {
      setIsCalculating(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await calculateReviewAbcAction(formData, abcParams);

        if (response.error) {
          setError(response.error);
          return;
        }

        if (response.result) {
          setAbcResult(response.result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "計算中にエラーが発生しました");
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [file, parsedData, abcParams]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData(null);
    setPublishedAssessment(null);
    setAbcResult(null);
    setError(null);
    setSuccess(null);
    setFetchError(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await parseExcelAction(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setParsedData(result.data);

        // Automatically fetch published assessment after parsing
        setIsFetchingPublished(true);
        try {
          const publishedResult = await getPublishedAssessmentAction(
            result.data.資源名,
            result.data.年度
          );

          if (publishedResult.error) {
            setFetchError(publishedResult.error);
          } else if (publishedResult.result) {
            setPublishedAssessment(publishedResult.result);
          }
        } catch (err) {
          setFetchError(err instanceof Error ? err.message : "公開データ取得エラー");
        } finally {
          setIsFetchingPublished(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "パース中にエラーが発生しました");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await saveReviewAction(formData, abcResult ?? undefined);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("保存しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  }, [file, abcResult]);

  // Loading state
  if (isLoading) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">査読用データアップロード</h1>
        <p className="text-secondary">読み込み中...</p>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">査読用データアップロード</h1>
        <p className="text-secondary">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-link hover:text-link-hover underline cursor-pointer bg-transparent border-0 p-0 font-inherit"
          >
            ログイン
          </button>
          してください。
        </p>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="mb-8">資源評価結果の査読</h1>

      <section className="mb-8">
        <h2 className="mb-4">データ表をアップロード</h2>
        <p className="text-secondary mb-4">
          <a href="https://abchan.fra.go.jp/hyouka/datatable/">資源評価結果ページ</a>
          からダウンロードした資源評価報告書のデータ表（Excel 形式）をアップロードしてください
        </p>

        <div className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isParsing}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer disabled:opacity-50"
          />

          {isParsing && <p className="text-sm text-secondary">読み込み中...</p>}
        </div>
      </section>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {parsedData && (
        <>
          <section className="mb-8">
            <h2 className="mb-4">データ表の要約</h2>

            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <span className="font-medium">資源名:</span> <span>{parsedData.資源名}</span>
              </div>
              <div>
                <span className="font-medium">年度:</span> <span>{parsedData.年度}</span>
              </div>
              <div>
                <span className="font-medium">最終年:</span> <span>{parsedData.最終年}</span>
              </div>
              <div>
                <span className="font-medium">コホート解析結果:</span>
                <ul className="ml-4 mt-2 text-sm text-secondary">
                  <li>
                    年範囲: {parsedData.年範囲.開始年}〜{parsedData.年範囲.終了年}年
                  </li>
                  <li>
                    年齢範囲: {parsedData.年齢範囲.最小年齢}〜{parsedData.年齢範囲.最大年齢}歳
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4">ABC 計算パラメータ</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="param-f" className="block text-sm font-medium mb-1">
                  F（漁獲係数）
                </label>
                <input
                  id="param-f"
                  type="number"
                  step="0.01"
                  value={abcParams.F}
                  onChange={(e) =>
                    setAbcParams((prev) => ({ ...prev, F: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="param-m" className="block text-sm font-medium mb-1">
                  M（自然死亡係数）
                </label>
                <input
                  id="param-m"
                  type="number"
                  step="0.01"
                  value={abcParams.M}
                  onChange={(e) =>
                    setAbcParams((prev) => ({ ...prev, M: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="param-beta" className="block text-sm font-medium mb-1">
                  β（調整係数）
                </label>
                <input
                  id="param-beta"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={abcParams.β}
                  onChange={(e) =>
                    setAbcParams((prev) => ({ ...prev, β: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {isCalculating && <p className="mt-2 text-sm text-secondary">計算中...</p>}
          </section>

          <section className="mb-8">
            <h2 className="mb-4">公開データとの比較</h2>
            <p className="text-sm text-secondary mb-4">ABC 算定対象年: {parsedData.年度 + 1}年</p>

            {isFetchingPublished && <p className="text-sm text-secondary">公開データを取得中...</p>}

            {fetchError && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">{fetchError}</p>
              </div>
            )}

            {publishedAssessment && (
              <AssessmentComparison
                reviewerResult={abcResult}
                publishedResult={publishedAssessment.result}
                publishedParams={publishedAssessment.parameters}
              />
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-4">保存</h2>

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存する"}
            </Button>

            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">{success}</p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

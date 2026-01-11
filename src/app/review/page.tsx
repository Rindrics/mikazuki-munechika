"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useCallback } from "react";
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

  // Published assessment comparison state
  const [publishedAssessment, setPublishedAssessment] = useState<VersionedAssessmentResult | null>(
    null
  );
  const [isFetchingPublished, setIsFetchingPublished] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleCalculate = useCallback(async () => {
    if (!file) return;

    setIsCalculating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await calculateReviewAbcAction(formData);

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
  }, [file]);

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
            <h2 className="mb-4">公開データとの比較</h2>

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
            <h2 className="mb-4">ABC 計算</h2>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!file || isCalculating}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
              >
                {isCalculating ? "計算中..." : "ABC を計算"}
              </button>

              <div className="p-4 border rounded-lg bg-secondary-light">
                {abcResult ? (
                  <div>
                    <p className="font-medium mb-1">計算結果:</p>
                    <p>{abcResult.value}</p>
                  </div>
                ) : (
                  <p className="text-secondary italic">計算結果がここに表示されます</p>
                )}
              </div>
            </div>
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

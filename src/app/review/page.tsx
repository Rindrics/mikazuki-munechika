"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useCallback, useMemo } from "react";
import AuthModal from "@/components/auth-modal";
import { Button } from "@/components/atoms";
import {
  parseExcelAction,
  saveReviewAction,
  calculateReviewAbcAction,
  type ParsedDataSummary,
} from "./actions";
import type { ABC算定結果 } from "@/domain/data";

export default function ReviewPage() {
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDataSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(Date.now());

  // ABC calculation state
  const [漁獲データValue, set漁獲データValue] = useState("");
  const [生物学的データValue, set生物学的データValue] = useState("");
  const [abcResult, setAbcResult] = useState<ABC算定結果 | null>(null);
  const [calculatedParams, setCalculatedParams] = useState<{
    漁獲データ: string;
    生物学的データ: string;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Check if parameters have changed since calculation
  const hasParametersChanged = useMemo(() => {
    return !!(
      abcResult &&
      calculatedParams &&
      (calculatedParams.漁獲データ !== 漁獲データValue ||
        calculatedParams.生物学的データ !== 生物学的データValue)
    );
  }, [abcResult, calculatedParams, 漁獲データValue, 生物学的データValue]);

  const handleCalculate = useCallback(async () => {
    if (!parsedData) return;

    setIsCalculating(true);
    setError(null);
    try {
      const result = await calculateReviewAbcAction(
        parsedData.資源名,
        漁獲データValue,
        生物学的データValue
      );
      setAbcResult(result);
      // Track the parameters used for this calculation
      setCalculatedParams({
        漁獲データ: 漁獲データValue,
        生物学的データ: 生物学的データValue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "計算中にエラーが発生しました");
    } finally {
      setIsCalculating(false);
    }
  }, [parsedData, 漁獲データValue, 生物学的データValue]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData(null);
    setError(null);
    setSuccess(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await parseExcelAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setParsedData(result.data);
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

      const result = await saveReviewAction(
        formData,
        abcResult ?? undefined,
        calculatedParams?.漁獲データ,
        calculatedParams?.生物学的データ
      );

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
  }, [file, abcResult, calculatedParams]);

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
            key={inputKey}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isParsing}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer disabled:opacity-50"
          />

          {isParsing && <p className="text-sm text-secondary">パース中...</p>}
        </div>
      </section>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {parsedData && (
        <>
          <section className="mb-8">
            <h2 className="mb-4">パース結果</h2>

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
            <h2 className="mb-4">ABC 計算</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="catchData" className="block mb-2 font-medium">
                  漁獲データ
                </label>
                <input
                  id="catchData"
                  type="text"
                  value={漁獲データValue}
                  onChange={(e) => set漁獲データValue(e.target.value)}
                  placeholder="漁獲データを入力"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="biologicalData" className="block mb-2 font-medium">
                  生物学的データ
                </label>
                <input
                  id="biologicalData"
                  type="text"
                  value={生物学的データValue}
                  onChange={(e) => set生物学的データValue(e.target.value)}
                  placeholder="生物学的データを入力"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={!漁獲データValue || !生物学的データValue || isCalculating}
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

              {hasParametersChanged && (
                <p className="text-secondary text-sm">
                  パラメータが変更されました。保存するには再計算してください。
                </p>
              )}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4">保存</h2>

            <Button onClick={handleSave} disabled={isSaving || hasParametersChanged}>
              {isSaving ? "保存中..." : "保存する"}
            </Button>
          </section>
        </>
      )}
    </main>
  );
}

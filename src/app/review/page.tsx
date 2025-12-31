"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useCallback } from "react";
import AuthModal from "@/components/auth-modal";
import { Button } from "@/components/atoms";
import { parseExcelAction, saveReviewAction, type ParsedDataSummary } from "./actions";

export default function ReviewPage() {
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDataSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await saveReviewAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("保存しました");
        setParsedData(null);
        setFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  }, [file]);

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
          <span
            onClick={() => setIsAuthModalOpen(true)}
            className="text-link hover:text-link-hover underline cursor-pointer"
          >
            ログイン
          </span>
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
          <a href="https://abchan.fra.go.jp/hyouka/datatable/">
          資源評価結果ページ
          </a>
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

            <div className="pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  get担当資源情報s,
  ロールs,
  資源名,
  ABC算定結果,
} from "@/domain";
import ErrorCard from "@/components/error-card";
import { use, useState } from "react";
import Link from "next/link";
import { calculateAbcAction, saveAssessmentResultAction } from "./actions";

interface AssessmentPageProps {
  params: Promise<{ 資源名: string }>;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const { 資源名: encodedName } = use(params);
  const stockGroupName = decodeURIComponent(encodedName) as 資源名;

  const { user, isLoading } = useAuth();

  const [catchDataValue, set漁獲量データValue] = useState("");
  const [biologicalDataValue, set生物学的データValue] = useState("");
  const [calculationResult, setCalculationResult] = useState<ABC算定結果 | null>(
    null
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setIsSaved(false);
    setSaveError(null);
    try {
      const result = await calculateAbcAction(stockGroupName, catchDataValue, biologicalDataValue);
      setCalculationResult(result);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!calculationResult) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveAssessmentResultAction(stockGroupName, calculationResult);
      setIsSaved(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "登録に失敗しました";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">ログインしてください。</p>
      </main>
    );
  }

  // Check if user has permission for this stock group
  const assignments = get担当資源情報s(user);
  const assignment = assignments.find(({ 担当資源名 }) => 担当資源名 === stockGroupName);
  const hasPermission =
  assignment && (assignment.ロール === ロールs.主担当 || assignment.ロール === ロールs.副担当);

  if (!hasPermission) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <ErrorCard title="アクセス拒否（403）">
          <p className="mb-4">この資源の評価権限がありません。</p>
          <Link href="/assess" className="underline hover:opacity-80">
            担当資源一覧に戻る
          </Link>
        </ErrorCard>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/assess" className="text-link hover:text-link-hover underline text-sm">
          ← 担当資源一覧に戻る
        </Link>
      </div>

      <h1 className="mb-2">{stockGroupName}</h1>
      <p className="text-secondary mb-8">
        担当: <span className="font-medium">{assignment?.ロール}</span>
      </p>

      <section className="mb-8">
        <h2 className="mb-4">パラメータ入力</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="catchData" className="block mb-2 font-medium">
              漁獲データ
            </label>
            <input
              id="catchData"
              type="text"
              value={catchDataValue}
              onChange={(e) => set漁獲量データValue(e.target.value)}
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
              value={biologicalDataValue}
              onChange={(e) => set生物学的データValue(e.target.value)}
              placeholder="生物学的データを入力"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">計算・プレビュー</h2>

        <button
          type="button"
          onClick={handleCalculate}
          disabled={!catchDataValue || !biologicalDataValue || isCalculating}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? "計算中..." : "ABC を計算"}
        </button>

        <div className="mt-4 p-4 border rounded-lg bg-secondary-light">
          {calculationResult ? (
            <div>
              <p className="font-medium mb-1">計算結果:</p>
              <p>{calculationResult.value}</p>
            </div>
          ) : (
            <p className="text-secondary italic">計算結果がここに表示されます</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4">登録</h2>

        <button
          type="button"
          onClick={handleSave}
          disabled={!calculationResult || isSaving || isSaved}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-success-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "登録中..." : isSaved ? "登録済み" : "評価結果を登録"}
        </button>

        {isSaved && <p className="mt-4 text-success font-medium">評価結果を登録しました。</p>}

        {saveError && (
          <div className="mt-2 p-2 border border-danger rounded-lg bg-danger-light dark:bg-danger-hover ">
            <p className="text-danger-dark font-medium dark:text-foreground-dark">
              結果の登録に失敗しました
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

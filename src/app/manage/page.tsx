"use client";

import { useAuth } from "@/contexts/auth-context";
import type { 認証済資源評価管理者, 認証済評価担当者 } from "@/domain";
import ErrorCard from "@/components/error-card";
import { Button, Badge } from "@/components/atoms";
import { ConfirmDialog } from "@/components/molecules";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getFiscalYearsAction,
  getCurrentFiscalYearAction,
  setCurrentFiscalYearAction,
  createFiscalYearAction,
  deleteFiscalYearAction,
  type FiscalYearInfo,
} from "./actions";

type DialogType = "switch" | "create" | "delete" | null;

export default function ManagePage() {
  const { user, isLoading } = useAuth();
  const [fiscalYears, setFiscalYears] = useState<FiscalYearInfo[]>([]);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogYear, setDialogYear] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [years, current] = await Promise.all([
        getFiscalYearsAction(),
        getCurrentFiscalYearAction(),
      ]);
      setFiscalYears(years);
      setCurrentYear(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const is資源評価管理者 =
    user && (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者";

  useEffect(() => {
    if (!isLoading && is資源評価管理者) {
      fetchData();
    }
  }, [isLoading, is資源評価管理者, fetchData]);

  const openDialog = (type: DialogType, year: number) => {
    setDialogType(type);
    setDialogYear(year);
  };

  const closeDialog = () => {
    setDialogType(null);
    setDialogYear(null);
  };

  const handleSwitchYear = async () => {
    if (!dialogYear) return;
    setIsProcessing(true);
    try {
      await setCurrentFiscalYearAction(dialogYear);
      setCurrentYear(dialogYear);
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "年度の切り替えに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateYear = async () => {
    if (!dialogYear) return;
    setIsProcessing(true);
    try {
      await createFiscalYearAction(dialogYear);
      await fetchData();
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "年度の作成に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate next year to create (latest year + 1, or current calendar year if no years exist)
  const nextYearToCreate =
    fiscalYears.length > 0
      ? Math.max(...fiscalYears.map((fy) => fy.year)) + 1
      : new Date().getFullYear();

  const handleDeleteYear = async () => {
    if (!dialogYear) return;
    setIsProcessing(true);
    try {
      await deleteFiscalYearAction(dialogYear);
      await fetchData();
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "年度の削除に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">管理画面</h1>
        <p className="text-secondary">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">管理画面</h1>
        <p className="text-secondary">ログインしてください。</p>
      </main>
    );
  }

  if (!is資源評価管理者) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <ErrorCard title="アクセス拒否（403）">
          <p className="mb-4">この機能は管理者のみ利用できます。</p>
          <Link href="/" className="underline hover:opacity-80">
            ホームに戻る
          </Link>
        </ErrorCard>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-link hover:text-link-hover underline text-sm">
          ← ホームに戻る
        </Link>
      </div>

      <h1 className="mb-8">管理画面</h1>

      {error && (
        <div className="mb-6 p-4 border border-danger rounded-lg bg-danger-light">
          <p className="text-danger-dark">{error}</p>
          <button type="button" className="mt-2 text-sm underline" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-4">年度管理</h2>

        {isDataLoading ? (
          <p className="text-secondary">読み込み中...</p>
        ) : (
          <ul className="space-y-2">
            {/* Existing years */}
            {fiscalYears.map((fy) => (
              <li
                key={fy.year}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  currentYear === fy.year ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{fy.year}年度</span>
                  <span className="text-sm text-secondary">（{fy.assessmentCount}件の評価）</span>
                  {fy.allNotStarted && <Badge variant="secondary">すべて未着手</Badge>}
                </div>
                <div className="flex gap-2">
                  {currentYear === fy.year ? (
                    <Badge variant="primary">選択中</Badge>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDialog("switch", fy.year)}
                      >
                        切り替え
                      </Button>
                      {fy.allNotStarted && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDialog("delete", fy.year)}
                        >
                          削除
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}

            {/* Next year to create (inactive style) */}
            <li className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-secondary-light/50 dark:bg-secondary-dark/50 text-secondary">
              <div className="flex items-center gap-3">
                <span className="font-medium">{nextYearToCreate}年度</span>
                <span className="text-sm">（未作成）</span>
              </div>
              <Button
                variant="success"
                size="sm"
                onClick={() => openDialog("create", nextYearToCreate)}
              >
                作成する
              </Button>
            </li>
          </ul>
        )}
      </section>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={dialogType === "switch"}
        title="年度を切り替えますか？"
        message={`${dialogYear}年度に切り替えます。全ユーザーのヘッダ表示が変更されます。`}
        confirmLabel="切り替える"
        confirmVariant="primary"
        onConfirm={handleSwitchYear}
        onCancel={closeDialog}
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={dialogType === "create"}
        title="新しい年度を作成しますか？"
        message={`${dialogYear}年度の資源評価を初期化します。すべての資源の評価が「未着手」ステータスで作成されます。`}
        confirmLabel="作成する"
        confirmVariant="success"
        onConfirm={handleCreateYear}
        onCancel={closeDialog}
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={dialogType === "delete"}
        title="年度を削除しますか？"
        message={`${dialogYear}年度の資源評価をすべて削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        confirmVariant="danger"
        onConfirm={handleDeleteYear}
        onCancel={closeDialog}
        isLoading={isProcessing}
      />
    </main>
  );
}

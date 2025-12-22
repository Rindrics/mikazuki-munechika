"use client";

import { useState, useEffect } from "react";
import { Button, Badge } from "@/components/atoms";
import { ConfirmDialog } from "@/components/molecules";
import {
  setCurrentFiscalYearAction,
  createFiscalYearAction,
  deleteFiscalYearAction,
} from "../actions";
import type { FiscalYearData } from "../types";

type DialogType = "switch" | "create" | "delete" | null;

interface FiscalYearPanelProps {
  data: FiscalYearData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function FiscalYearPanel({ data, isLoading, onRefresh }: FiscalYearPanelProps) {
  const [currentYear, setCurrentYearState] = useState<number | null>(data?.currentYear ?? null);
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogYear, setDialogYear] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync currentYear when data changes
  useEffect(() => {
    if (data?.currentYear !== undefined) {
      setCurrentYearState(data.currentYear);
    }
  }, [data?.currentYear]);

  const fiscalYears = data?.fiscalYears ?? [];

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
      setCurrentYearState(dialogYear);
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
      await onRefresh();
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "年度の作成に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!dialogYear) return;
    setIsProcessing(true);
    try {
      await deleteFiscalYearAction(dialogYear);
      await onRefresh();
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "年度の削除に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextYearToCreate =
    fiscalYears.length > 0
      ? Math.max(...fiscalYears.map((fy) => fy.year)) + 1
      : new Date().getFullYear();

  return (
    <>
      {error && (
        <div className="mb-6 p-4 border border-danger rounded-lg bg-danger-light">
          <p className="text-danger-dark">{error}</p>
          <button type="button" className="mt-2 text-sm underline" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-secondary">読み込み中...</p>
      ) : (
        <ul className="space-y-2">
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
    </>
  );
}

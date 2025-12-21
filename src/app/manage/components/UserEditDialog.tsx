"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal, Button, IconButton } from "@/components/atoms";
import type { ユーザー情報 } from "@/domain/repositories";
import type { 資源名, ロール } from "@/domain";
import { updateUserAssignmentsAction } from "../actions";

interface AssignmentRow {
  id: string;
  stockName: string;
  role: "主担当" | "副担当";
}

interface UserEditDialogProps {
  isOpen: boolean;
  user: ユーザー情報 | null;
  stockGroups: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

let rowIdCounter = 0;
const generateRowId = () => `row-${++rowIdCounter}`;

export function UserEditDialog({
  isOpen,
  user,
  stockGroups,
  onClose,
  onSaved,
}: UserEditDialogProps) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize rows when user changes
  useEffect(() => {
    if (user) {
      const initialRows: AssignmentRow[] = user.担当資源
        .filter((r) => r.ロール !== "管理者")
        .map((r) => ({
          id: generateRowId(),
          stockName: r.資源名,
          role: r.ロール as "主担当" | "副担当",
        }));
      setRows(initialRows);
    }
  }, [user]);

  // Get available stock names (not already selected)
  const getAvailableStocks = (currentRowId: string) => {
    const selectedStocks = rows
      .filter((r) => r.id !== currentRowId)
      .map((r) => r.stockName);
    return stockGroups.filter((sg) => !selectedStocks.includes(sg.name));
  };

  const handleAddRow = () => {
    const availableStocks = getAvailableStocks("");
    if (availableStocks.length === 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: generateRowId(),
        stockName: availableStocks[0].name,
        role: "副担当",
      },
    ]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleStockChange = (rowId: string, stockName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, stockName } : r))
    );
  };

  const handleRoleChange = (rowId: string, role: "主担当" | "副担当") => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, role } : r))
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setIsProcessing(true);
    setError(null);

    try {
      const newAssignments = rows.map((r) => ({
        stockName: r.stockName as 資源名,
        role: r.role as ロール,
      }));

      await updateUserAssignmentsAction(user.id, newAssignments);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!user) return null;

  const canAddMore = getAvailableStocks("").length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">担当資源の編集</h2>

        <div className="mb-4">
          <p className="text-sm text-secondary">
            {user.氏名 || user.メールアドレス} の担当資源を設定します
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-danger rounded bg-danger-light">
            <p className="text-sm text-danger-dark">{error}</p>
          </div>
        )}

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-secondary py-4 text-center">
              担当資源がありません
            </p>
          ) : (
            rows.map((row) => {
              const availableStocks = getAvailableStocks(row.id);
              // Include current selection in available options
              const stockOptions = stockGroups.filter(
                (sg) => sg.name === row.stockName || availableStocks.some((as) => as.name === sg.name)
              );

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-2 p-2 border rounded bg-secondary-light/20"
                >
                  <select
                    value={row.stockName}
                    onChange={(e) => handleStockChange(row.id, e.target.value)}
                    className="flex-1 text-sm border rounded px-2 py-1.5 bg-white dark:bg-gray-800"
                  >
                    {stockOptions.map((sg) => (
                      <option key={sg.id} value={sg.name}>
                        {sg.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.role}
                    onChange={(e) =>
                      handleRoleChange(row.id, e.target.value as "主担当" | "副担当")
                    }
                    className="text-sm border rounded px-2 py-1.5 bg-white dark:bg-gray-800"
                  >
                    <option value="主担当">主担当</option>
                    <option value="副担当">副担当</option>
                  </select>

                  <IconButton
                    variant="danger"
                    onClick={() => handleRemoveRow(row.id)}
                    title="削除"
                  >
                    <FiTrash2 size={16} />
                  </IconButton>
                </div>
              );
            })
          )}
        </div>

        {canAddMore && (
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mb-6"
          >
            <FiPlus size={16} />
            <span>担当資源を追加</span>
          </button>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

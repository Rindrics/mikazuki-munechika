"use client";

import { useState, useMemo } from "react";
import { FiPlus, FiTrash2, FiPlusCircle, FiMinusCircle } from "react-icons/fi";
import { Modal, Button, IconButton, Badge } from "@/components/atoms";
import type { 資源名, ロール } from "@/domain";
import { inviteUserAction } from "../actions";

interface AssignmentRow {
  id: string;
  stockName: string;
  role: "主担当" | "副担当";
}

interface UserInviteDialogProps {
  isOpen: boolean;
  stockGroups: Array<{ id: string; name: string }>;
  existingEmails: string[];
  onClose: () => void;
  onInvited: () => Promise<void>;
}

let rowIdCounter = 0;
const generateRowId = () => `invite-row-${++rowIdCounter}`;

export function UserInviteDialog({
  isOpen,
  stockGroups,
  existingEmails,
  onClose,
  onInvited,
}: UserInviteDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if email already exists
  const isDuplicateEmail = useMemo(() => {
    const trimmedEmail = email.trim().toLowerCase();
    return trimmedEmail !== "" && existingEmails.some((e) => e.toLowerCase() === trimmedEmail);
  }, [email, existingEmails]);

  // Reset form when dialog opens
  const resetForm = () => {
    setName("");
    setEmail("");
    setRows([]);
    setError(null);
    setShowConfirm(false);
  };

  // Get available stock names (not already selected)
  const getAvailableStocks = (currentRowId: string) => {
    const selectedStocks = rows.filter((r) => r.id !== currentRowId).map((r) => r.stockName);
    return stockGroups.filter((sg) => !selectedStocks.includes(sg.name));
  };

  // Clear error when form changes
  const clearError = () => {
    if (error) setError(null);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    clearError();
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearError();
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
    clearError();
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    clearError();
  };

  const handleStockChange = (rowId: string, stockName: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, stockName } : r)));
    clearError();
  };

  const handleRoleChange = (rowId: string, role: "主担当" | "副担当") => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, role } : r)));
    clearError();
  };

  const isValidForm = useMemo(() => {
    return name.trim() !== "" && email.trim() !== "" && email.includes("@") && !isDuplicateEmail;
  }, [name, email, isDuplicateEmail]);

  const handleSubmit = () => {
    if (!isValidForm) return;
    setShowConfirm(true);
  };

  const handleConfirmInvite = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const stockAssignments = rows.map((r) => ({
        stockName: r.stockName as 資源名,
        role: r.role as ロール,
      }));

      await inviteUserAction({
        name: name.trim(),
        email: email.trim(),
        stockAssignments,
      });

      await onInvited();
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待に失敗しました");
      setShowConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canAddMore = getAvailableStocks("").length > 0;

  // Confirmation view
  if (showConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={handleCancelConfirm} size="lg">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">招待内容の確認</h2>

          <div className="mb-4">
            <p className="text-sm text-secondary">
              以下の内容でユーザーを招待します。招待メールが送信されます。
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 border border-danger rounded bg-danger-light">
              <p className="text-sm text-danger-dark">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="border rounded p-4 bg-secondary-light/20">
              <dl className="space-y-2">
                <div className="flex">
                  <dt className="w-24 text-sm text-secondary">氏名</dt>
                  <dd className="text-sm font-medium">{name}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-sm text-secondary">メール</dt>
                  <dd className="text-sm font-medium">{email}</dd>
                </div>
              </dl>
            </div>

            {rows.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-success-dark flex items-center gap-1">
                  <FiPlusCircle size={14} />
                  担当資源
                </p>
                <div className="pl-5 space-y-1">
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 text-sm">
                      <span>{row.stockName}</span>
                      <Badge variant="default">{row.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rows.length === 0 && (
              <div className="space-y-1">
                <p className="text-sm text-secondary flex items-center gap-1">
                  <FiMinusCircle size={14} />
                  担当資源なしで招待します
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={handleCancelConfirm} disabled={isProcessing}>
              戻る
            </Button>
            <Button variant="primary" onClick={handleConfirmInvite} disabled={isProcessing}>
              {isProcessing ? "招待中..." : "招待を送信"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Input form view
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">ユーザーを招待</h2>

        <div className="mb-4">
          <p className="text-sm text-secondary">
            新しいユーザーを招待します。入力されたメールアドレスに招待メールが送信されます。
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-danger rounded bg-danger-light">
            <p className="text-sm text-danger-dark">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Name input */}
          <div>
            <label htmlFor="invite-name" className="block text-sm font-medium mb-1">
              氏名 <span className="text-danger">*</span>
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="例: 山田 太郎"
              className="w-full text-sm border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          {/* Email input */}
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium mb-1">
              メールアドレス <span className="text-danger">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="例: taro.yamada@example.com"
              className={`w-full text-sm border rounded px-3 py-2 bg-white dark:bg-gray-800 ${
                isDuplicateEmail ? "border-danger" : ""
              }`}
            />
            {isDuplicateEmail && (
              <p className="mt-1 text-sm text-danger">このメールアドレスは既に登録されています</p>
            )}
          </div>

          {/* Stock assignments */}
          <div>
            <label className="block text-sm font-medium mb-2">担当資源（任意）</label>
            <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="text-sm text-secondary py-2">
                  担当資源を追加できます（後から設定することも可能です）
                </p>
              ) : (
                rows.map((row) => {
                  const availableStocks = getAvailableStocks(row.id);
                  const stockOptions = stockGroups.filter(
                    (sg) =>
                      sg.name === row.stockName || availableStocks.some((as) => as.name === sg.name)
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
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <FiPlus size={16} />
                <span>担当資源を追加</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!isValidForm || isProcessing}>
            次へ
          </Button>
        </div>
      </div>
    </Modal>
  );
}

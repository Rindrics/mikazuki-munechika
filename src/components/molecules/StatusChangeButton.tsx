"use client";

import { Button, type ButtonVariant } from "../atoms";
import { ConfirmDialog } from "./ConfirmDialog";
import { useState } from "react";

interface StatusChangeButtonProps {
  label: string;
  confirmTitle?: string;
  confirmMessage?: string;
  variant?: ButtonVariant;
  onAction: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * StatusChangeButton - Molecule component for status change actions
 *
 * Shows confirmation dialog before executing action
 */
export function StatusChangeButton({
  label,
  confirmTitle = "確認",
  confirmMessage = "この操作を実行しますか？",
  variant = "primary",
  onAction,
  disabled = false,
  className = "",
}: StatusChangeButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onAction();
      setIsDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant={variant}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
      >
        {label}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <ConfirmDialog
        isOpen={isDialogOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={label}
        confirmVariant={variant}
        onConfirm={handleConfirm}
        onCancel={() => setIsDialogOpen(false)}
        isLoading={isLoading}
      />
    </div>
  );
}

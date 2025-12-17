"use client";

import { Button, type ButtonVariant, type ButtonSize } from "../atoms";
import { ConfirmDialog } from "./ConfirmDialog";
import { useState } from "react";

interface StatusChangeButtonProps {
  label: string;
  confirmTitle?: string;
  confirmMessage?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
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
  size = "md",
  fullWidth = false,
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

  const handleCancel = () => {
    setIsDialogOpen(false);
    setError(null);
  };

  const handleOpen = () => {
    setError(null);
    setIsDialogOpen(true);
  };

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleOpen}
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
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}

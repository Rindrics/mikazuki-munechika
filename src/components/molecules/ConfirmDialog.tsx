"use client";

import type { ReactNode } from "react";
import { Modal, Button, type ButtonVariant } from "../atoms";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  /** Error message to display below the main message */
  errorMessage?: string | null;
  /** Optional neutral action button (displayed between cancel and confirm) */
  neutralLabel?: string;
  onNeutral?: () => void;
}

/**
 * ConfirmDialog - Molecule component for confirmation dialogs
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  isLoading = false,
  errorMessage,
  neutralLabel,
  onNeutral,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <div className="text-secondary mb-4">{message}</div>
        {errorMessage && <p className="text-danger text-sm mb-4">{errorMessage}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          {neutralLabel && onNeutral && (
            <Button variant="secondary" onClick={onNeutral} disabled={isLoading}>
              {neutralLabel}
            </Button>
          )}
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

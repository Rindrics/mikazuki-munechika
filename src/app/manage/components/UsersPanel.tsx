"use client";

import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Button, Badge, IconButton } from "@/components/atoms";
import { ConfirmDialog } from "@/components/molecules";
import type { ユーザー情報 } from "@/domain/repositories";
import { deleteUserAction } from "../actions";
import type { UsersData } from "../types";
import { UserEditDialog } from "./UserEditDialog";
import { UserInviteDialog } from "./UserInviteDialog";

type DialogType = "invite" | "edit" | "delete" | null;

interface UsersPanelProps {
  data: UsersData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  action?: string | null;
  onActionChange?: (action: string | null) => void;
}

export function UsersPanel({
  data,
  isLoading,
  onRefresh,
  action,
  onActionChange,
}: UsersPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedUser, setSelectedUser] = useState<ユーザー情報 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync dialog state with URL action parameter
  useEffect(() => {
    if (action === "invite" && dialogType !== "invite") {
      setDialogType("invite");
    }
  }, [action, dialogType]);

  // Filter state
  const [stockFilter, setStockFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const allUsers = data?.users ?? [];
  const stockGroups = data?.stockGroups ?? [];

  // Helper to check if user is admin
  const isAdmin = (u: ユーザー情報) => u.担当資源.some((r) => r.ロール === "管理者");

  // Get unique stock names and roles for filter options
  const uniqueStocks = Array.from(
    new Set(allUsers.flatMap((u) => u.担当資源.map((r) => r.資源名)))
  ).sort();
  const uniqueRoles = Array.from(
    new Set(allUsers.flatMap((u) => u.担当資源.map((r) => r.ロール)))
  )
    .filter((r) => r !== "管理者")
    .sort();

  // Filter users
  const users = allUsers.filter((u) => {
    const nonAdminAssignments = u.担当資源.filter((r) => r.ロール !== "管理者");
    const matchesStock =
      !stockFilter || nonAdminAssignments.some((r) => r.資源名 === stockFilter);
    const matchesRole = !roleFilter || nonAdminAssignments.some((r) => r.ロール === roleFilter);
    return matchesStock && matchesRole;
  });

  const openDialog = (type: DialogType, targetUser?: ユーザー情報) => {
    setDialogType(type);
    setSelectedUser(targetUser || null);
    // Update URL for invite action only (shareable)
    if (type === "invite" && onActionChange) {
      onActionChange("invite");
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedUser(null);
    // Clear URL action parameter
    if (onActionChange) {
      onActionChange(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      await deleteUserAction(selectedUser.id);
      await onRefresh();
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ユーザーの削除に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">登録ユーザー</h2>
        <Button variant="success" onClick={() => openDialog("invite")}>
          ユーザーを招待
        </Button>
      </div>

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
      ) : allUsers.length === 0 ? (
        <p className="text-secondary">登録されているユーザーはいません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">氏名</th>
                <th className="text-left p-3">メールアドレス</th>
                <th className="text-left p-3">
                  <div className="flex flex-col gap-1">
                    <span>資源</span>
                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="text-sm font-normal border rounded px-2 py-1 bg-white dark:bg-gray-800"
                    >
                      <option value="">すべて</option>
                      {uniqueStocks.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="text-left p-3">
                  <div className="flex flex-col gap-1">
                    <span>ロール</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="text-sm font-normal border rounded px-2 py-1 bg-white dark:bg-gray-800"
                    >
                      <option value="">すべて</option>
                      {uniqueRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="text-right p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-secondary">
                    該当するユーザーがいません
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const userIsAdmin = isAdmin(u);
                  const nonAdminAssignments = u.担当資源.filter((r) => r.ロール !== "管理者");
                  return (
                    <tr
                      key={u.id}
                      className={`border-b ${
                        userIsAdmin
                          ? "bg-secondary-light/20 text-secondary"
                          : "hover:bg-secondary-light/30"
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap">
                        {u.氏名 || "（未設定）"}
                      </td>
                      <td className="p-3">{u.メールアドレス}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {nonAdminAssignments.length === 0 ? (
                            <span className="text-secondary text-sm">—</span>
                          ) : (
                            nonAdminAssignments.map((r, i) => (
                              <Badge key={i} variant="secondary">
                                {r.資源名}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {userIsAdmin ? (
                            <Badge variant="info">管理者</Badge>
                          ) : nonAdminAssignments.length === 0 ? (
                            <span className="text-secondary text-sm">—</span>
                          ) : (
                            [...new Set(nonAdminAssignments.map((r) => r.ロール))].map(
                              (role, i) => (
                                <Badge
                                  key={i}
                                  variant={role === "主担当" ? "primary" : "secondary"}
                                >
                                  {role}
                                </Badge>
                              )
                            )
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {!userIsAdmin && (
                          <div className="flex justify-end gap-1">
                            <IconButton
                              variant="primary"
                              onClick={() => openDialog("edit", u)}
                              title="編集"
                            >
                              <FiEdit2 size={16} />
                            </IconButton>
                            <IconButton
                              variant="danger"
                              onClick={() => openDialog("delete", u)}
                              title="削除"
                            >
                              <FiTrash2 size={16} />
                            </IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={dialogType === "delete"}
        title="ユーザーを削除しますか？"
        message={`${selectedUser?.氏名 || selectedUser?.メールアドレス} をシステムから削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        confirmVariant="danger"
        onConfirm={handleDeleteUser}
        onCancel={closeDialog}
        isLoading={isProcessing}
      />

      <UserEditDialog
        isOpen={dialogType === "edit"}
        user={selectedUser}
        stockGroups={stockGroups}
        onClose={closeDialog}
        onSaved={onRefresh}
      />

      <UserInviteDialog
        isOpen={dialogType === "invite"}
        stockGroups={stockGroups}
        existingEmails={allUsers.map((u) => u.メールアドレス)}
        onClose={closeDialog}
        onInvited={onRefresh}
      />
    </>
  );
}

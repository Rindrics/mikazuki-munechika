"use client";

import { useAuth } from "@/contexts/auth-context";
import type { 認証済資源評価管理者, 認証済評価担当者 } from "@/domain";
import type { ユーザー情報 } from "@/domain/repositories";
import ErrorCard from "@/components/error-card";
import AuthModal from "@/components/auth-modal";
import { Button, Badge } from "@/components/atoms";
import { ConfirmDialog } from "@/components/molecules";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  getFiscalYearsAction,
  getCurrentFiscalYearAction,
  setCurrentFiscalYearAction,
  createFiscalYearAction,
  deleteFiscalYearAction,
  getUsersAction,
  getStockGroupsAction,
  deleteUserAction,
  type FiscalYearInfo,
} from "./actions";

type Tab = "fiscal-year" | "users";
type FiscalYearDialogType = "switch" | "create" | "delete" | null;
type UserDialogType = "invite" | "edit" | "delete" | null;

// =============================================================================
// Data types for prefetching
// =============================================================================

interface FiscalYearData {
  fiscalYears: FiscalYearInfo[];
  currentYear: number | null;
}

interface UsersData {
  users: ユーザー情報[];
  stockGroups: Array<{ id: string; name: string }>;
}

// =============================================================================
// Tab Navigation
// =============================================================================

function TabNavigation({ currentTab }: { currentTab: Tab }) {
  const router = useRouter();

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "fiscal-year", label: "年度管理" },
    { id: "users", label: "ユーザー管理" },
  ];

  return (
    <div className="flex border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.id === "fiscal-year" ? "/manage" : `/manage?tab=${tab.id}`)}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            currentTab === tab.id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-secondary hover:text-primary hover:border-primary/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Fiscal Year Panel
// =============================================================================

interface FiscalYearPanelProps {
  data: FiscalYearData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

function FiscalYearPanel({ data, isLoading, onRefresh }: FiscalYearPanelProps) {
  const [currentYear, setCurrentYearState] = useState<number | null>(data?.currentYear ?? null);
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<FiscalYearDialogType>(null);
  const [dialogYear, setDialogYear] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync currentYear when data changes
  useEffect(() => {
    if (data?.currentYear !== undefined) {
      setCurrentYearState(data.currentYear);
    }
  }, [data?.currentYear]);

  const fiscalYears = data?.fiscalYears ?? [];

  const openDialog = (type: FiscalYearDialogType, year: number) => {
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

// =============================================================================
// Users Panel
// =============================================================================

interface UsersPanelProps {
  data: UsersData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

function UsersPanel({ data, isLoading, onRefresh }: UsersPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [dialogType, setDialogType] = useState<UserDialogType>(null);
  const [selectedUser, setSelectedUser] = useState<ユーザー情報 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
  ).filter((r) => r !== "管理者").sort();

  // Filter users
  const users = allUsers.filter((u) => {
    const nonAdminAssignments = u.担当資源.filter((r) => r.ロール !== "管理者");
    const matchesStock = !stockFilter || nonAdminAssignments.some((r) => r.資源名 === stockFilter);
    const matchesRole = !roleFilter || nonAdminAssignments.some((r) => r.ロール === roleFilter);
    return matchesStock && matchesRole;
  });

  const openDialog = (type: UserDialogType, targetUser?: ユーザー情報) => {
    setDialogType(type);
    setSelectedUser(targetUser || null);
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedUser(null);
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
                      <td className="p-3">
                        {u.氏名 || "（未設定）"}
                        {userIsAdmin && (
                          <Badge variant="primary" className="ml-2">
                            管理者
                          </Badge>
                        )}
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
                          {nonAdminAssignments.length === 0 ? (
                            <span className="text-secondary text-sm">—</span>
                          ) : (
                            [...new Set(nonAdminAssignments.map((r) => r.ロール))].map((role, i) => (
                              <Badge key={i} variant={role === "主担当" ? "primary" : "secondary"}>
                                {role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {!userIsAdmin && (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openDialog("edit", u)}
                              className="p-2 text-secondary hover:text-primary rounded hover:bg-secondary-light/50 transition-colors"
                              title="編集"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDialog("delete", u)}
                              className="p-2 text-secondary hover:text-danger rounded hover:bg-danger-light/50 transition-colors"
                              title="削除"
                            >
                              <FiTrash2 size={16} />
                            </button>
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

      {/* TODO: Invite Dialog */}
      {/* TODO: Edit Dialog */}
    </>
  );
}

// =============================================================================
// Main Page Content with Prefetching
// =============================================================================

function ManagePageContent() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "fiscal-year";
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Data state
  const [fiscalYearData, setFiscalYearData] = useState<FiscalYearData | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [isFiscalYearLoading, setIsFiscalYearLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  // Track if prefetch has been triggered
  const prefetchTriggered = useRef(false);

  const is資源評価管理者 =
    user && (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者";

  // Fetch fiscal year data
  const fetchFiscalYearData = useCallback(async () => {
    try {
      const [fiscalYears, currentYear] = await Promise.all([
        getFiscalYearsAction(),
        getCurrentFiscalYearAction(),
      ]);
      setFiscalYearData({ fiscalYears, currentYear });
    } catch (err) {
      console.error("Failed to fetch fiscal year data:", err);
    } finally {
      setIsFiscalYearLoading(false);
    }
  }, []);

  // Fetch users data
  const fetchUsersData = useCallback(async () => {
    try {
      const [users, stockGroups] = await Promise.all([
        getUsersAction(),
        getStockGroupsAction(),
      ]);
      setUsersData({ users, stockGroups });
    } catch (err) {
      console.error("Failed to fetch users data:", err);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  // Initial data fetch based on current tab
  useEffect(() => {
    if (!isAuthLoading && is資源評価管理者) {
      if (tab === "fiscal-year") {
        fetchFiscalYearData();
      } else if (tab === "users") {
        fetchUsersData();
      }
    }
  }, [isAuthLoading, is資源評価管理者, tab, fetchFiscalYearData, fetchUsersData]);

  // Prefetch other tab's data in idle time
  useEffect(() => {
    if (!isAuthLoading && is資源評価管理者 && !prefetchTriggered.current) {
      // Wait for initial render to complete, then prefetch
      const prefetch = () => {
        prefetchTriggered.current = true;
        if (tab === "fiscal-year" && usersData === null) {
          // Prefetch users data
          fetchUsersData();
        } else if (tab === "users" && fiscalYearData === null) {
          // Prefetch fiscal year data
          fetchFiscalYearData();
        }
      };

      // Use requestIdleCallback if available, otherwise setTimeout
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(prefetch, { timeout: 2000 });
      } else {
        setTimeout(prefetch, 100);
      }
    }
  }, [
    isAuthLoading,
    is資源評価管理者,
    tab,
    usersData,
    fiscalYearData,
    fetchUsersData,
    fetchFiscalYearData,
  ]);

  if (isAuthLoading) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="mb-8">管理画面</h1>
        <p className="text-secondary">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="mb-8">管理画面</h1>
        <p className="text-secondary">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="text-primary underline hover:opacity-80"
          >
            ログイン
          </button>
        </p>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </main>
    );
  }

  if (!is資源評価管理者) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
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
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-link hover:text-link-hover underline text-sm">
          ← ホームに戻る
        </Link>
      </div>

      <h1 className="mb-6">管理画面</h1>

      <TabNavigation currentTab={tab} />

      {tab === "fiscal-year" && (
        <FiscalYearPanel
          data={fiscalYearData}
          isLoading={isFiscalYearLoading}
          onRefresh={fetchFiscalYearData}
        />
      )}
      {tab === "users" && (
        <UsersPanel
          data={usersData}
          isLoading={isUsersLoading}
          onRefresh={fetchUsersData}
        />
      )}
    </main>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={<div className="p-8">読み込み中...</div>}>
      <ManagePageContent />
    </Suspense>
  );
}

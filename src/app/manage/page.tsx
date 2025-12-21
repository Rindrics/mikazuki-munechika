"use client";

import { useAuth } from "@/contexts/auth-context";
import type { 認証済資源評価管理者, 認証済評価担当者 } from "@/domain";
import ErrorCard from "@/components/error-card";
import AuthModal from "@/components/auth-modal";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFiscalYearsAction,
  getCurrentFiscalYearAction,
  getUsersAction,
  getStockGroupsAction,
} from "./actions";
import { TabNavigation, FiscalYearPanel, UsersPanel } from "./components";
import type { Tab, FiscalYearData, UsersData } from "./types";

function ManagePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) || "fiscal-year";
  const action = searchParams.get("action");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Update URL action parameter
  const setAction = useCallback(
    (newAction: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newAction) {
        params.set("action", newAction);
      } else {
        params.delete("action");
      }
      router.replace(`/manage?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

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
      const prefetch = () => {
        prefetchTriggered.current = true;
        if (tab === "fiscal-year" && usersData === null) {
          fetchUsersData();
        } else if (tab === "users" && fiscalYearData === null) {
          fetchFiscalYearData();
        }
      };

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
          action={action}
          onActionChange={setAction}
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

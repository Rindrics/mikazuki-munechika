"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useMemo } from "react";
import {
  get評価可能資源s,
  認証済評価担当者,
  認証済資源評価管理者,
  ロールs,
  資源名s,
  資源名,
  create資源情報,
} from "@/domain";
import type { 評価ステータス } from "@/domain/models/stock/status";
import Link from "next/link";
import AuthModal from "@/components/auth-modal";
import { StatusBadge } from "@/components/molecules";
import { getAssessmentStatusAction } from "./[stock]/actions";

export default function AssessPage() {
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [statusMap, setStatusMap] = useState<Map<資源名, 評価ステータス>>(new Map());

  // Get assessable stocks for the user (memoized to prevent infinite re-renders)
  // Must be called at top level to comply with Rules of Hooks
  const 全資源名リスト = useMemo(() => Object.values(資源名s), []);
  const assessableStocks = useMemo(
    () =>
      user ? get評価可能資源s(user as 認証済評価担当者 | 認証済資源評価管理者, 全資源名リスト) : [],
    [user, 全資源名リスト]
  );

  // Check if user is administrator
  const is管理者 = useMemo(
    () =>
      user ? (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者" : false,
    [user]
  );

  // Group stocks by role
  const 主担当資源s = useMemo(
    () => assessableStocks.filter(({ ロール }) => ロール === ロールs.主担当),
    [assessableStocks]
  );
  const 副担当資源s = useMemo(
    () => assessableStocks.filter(({ ロール }) => ロール === ロールs.副担当),
    [assessableStocks]
  );
  const 管理資源s = useMemo(
    () => assessableStocks.filter(({ ロール }) => ロール === ロールs.管理者),
    [assessableStocks]
  );

  // Fetch status for all assessable stocks
  useEffect(() => {
    const fetchStatuses = async () => {
      const newStatusMap = new Map<資源名, 評価ステータス>();
      await Promise.all(
        assessableStocks.map(async ({ 担当資源名 }) => {
          try {
            const { status } = await getAssessmentStatusAction(担当資源名);
            newStatusMap.set(担当資源名, status);
          } catch (error) {
            console.error(`Failed to fetch status for ${担当資源名}:`, error);
          }
        })
      );
      setStatusMap(newStatusMap);
    };

    if (assessableStocks.length > 0) {
      fetchStatuses();
    }
  }, [assessableStocks]);

  // Early returns after all hooks
  if (isLoading) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">読み込み中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">
          <span
            onClick={() => setIsAuthModalOpen(true)}
            className="text-link hover:text-link-hover underline cursor-pointer"
          >
            ログイン
          </span>
          してください。
        </p>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </main>
    );
  }

  if (assessableStocks.length === 0) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">
          {is管理者 ? "管理している資源がありません。" : "担当している資源がありません。"}
        </p>
      </main>
    );
  }

  // Reusable stock list component
  const StockList = ({ stocks }: { stocks: typeof assessableStocks }) => (
    <ul className="space-y-3">
      {stocks.map(({ 担当資源名 }) => {
        const 資源情報 = create資源情報(担当資源名);
        const status = statusMap.get(担当資源名);
        return (
          <li key={担当資源名}>
            <Link
              href={`/assess/${資源情報.slug}`}
              className="block p-4 border rounded-lg hover:bg-secondary-light transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{担当資源名}</span>
                {status && <StatusBadge status={status} />}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="mb-8">資源評価</h1>

      {主担当資源s.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4">主担当中の資源</h2>
          <StockList stocks={主担当資源s} />
        </section>
      )}

      {副担当資源s.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4">副担当中の資源</h2>
          <StockList stocks={副担当資源s} />
        </section>
      )}

      {管理資源s.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4">管理中の資源</h2>
          <StockList stocks={管理資源s} />
        </section>
      )}
    </main>
  );
}

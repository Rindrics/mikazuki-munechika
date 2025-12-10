"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { getStockGroupRoleAssignments, ROLES } from "@/domain";
import Link from "next/link";
import AuthModal from "@/components/auth-modal";

export default function AssessPage() {
  const { user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  // Get stock groups where user is PRIMARY or SECONDARY
  const userRoles = getStockGroupRoleAssignments(user);
  const assessableStocks = userRoles.filter(
    ({ role }) => role === ROLES.PRIMARY || role === ROLES.SECONDARY
  );

  if (assessableStocks.length === 0) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <h1 className="mb-8">資源評価</h1>
        <p className="text-secondary">担当している資源がありません。</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="mb-8">資源評価</h1>
      <section>
        <h2 className="mb-4">担当資源一覧</h2>
        <ul className="space-y-3">
          {assessableStocks.map(({ stockGroupName, role }) => (
            <li key={stockGroupName}>
              <Link
                href={`/assess/${encodeURIComponent(stockGroupName)}`}
                className="block p-4 border rounded-lg hover:bg-secondary-light transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stockGroupName}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      role === ROLES.PRIMARY
                        ? "bg-primary-light text-foreground dark:bg-primary-dark dark:text-foreground-dark"
                        : "bg-secondary-light text-foreground dark:bg-secondary-dark dark:text-foreground-dark"
                    }`}
                  >
                    {role}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

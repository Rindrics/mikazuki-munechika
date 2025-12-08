"use client";

import { useAuth } from "@/contexts/auth-context";
import { getUserStockGroupRoles, USER_ROLES, StockGroupName } from "@/domain";
import ErrorCard from "@/components/error-card";
import { use, useState } from "react";
import Link from "next/link";

interface AssessmentPageProps {
  params: Promise<{ stockGroupName: string }>;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const { stockGroupName: encodedName } = use(params);
  const stockGroupName = decodeURIComponent(encodedName) as StockGroupName;

  const { user, isLoading } = useAuth();

  const [catchDataValue, setCatchDataValue] = useState("");
  const [biologicalDataValue, setBiologicalDataValue] = useState("");

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
        <p className="text-secondary">ログインしてください。</p>
      </main>
    );
  }

  // Check if user has permission for this stock group
  const userRoles = getUserStockGroupRoles(user);
  const userRole = userRoles.find(({ stockGroupName: name }) => name === stockGroupName);
  const hasPermission =
    userRole && (userRole.role === USER_ROLES.PRIMARY || userRole.role === USER_ROLES.SECONDARY);

  if (!hasPermission) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <ErrorCard title="アクセス拒否（403）">
          <p className="mb-4">この資源の評価権限がありません。</p>
          <Link href="/assess" className="underline hover:opacity-80">
            担当資源一覧に戻る
          </Link>
        </ErrorCard>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/assess" className="text-link hover:text-link-hover underline text-sm">
          ← 担当資源一覧に戻る
        </Link>
      </div>

      <h1 className="mb-2">{stockGroupName}</h1>
      <p className="text-secondary mb-8">
        担当: <span className="font-medium">{userRole.role}</span>
      </p>

      <section className="mb-8">
        <h2 className="mb-4">パラメータ入力</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="catchData" className="block mb-2 font-medium">
              漁獲データ
            </label>
            <input
              id="catchData"
              type="text"
              value={catchDataValue}
              onChange={(e) => setCatchDataValue(e.target.value)}
              placeholder="漁獲データを入力"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="biologicalData" className="block mb-2 font-medium">
              生物学的データ
            </label>
            <input
              id="biologicalData"
              type="text"
              value={biologicalDataValue}
              onChange={(e) => setBiologicalDataValue(e.target.value)}
              placeholder="生物学的データを入力"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">計算・プレビュー</h2>

        <button
          type="button"
          disabled={!catchDataValue || !biologicalDataValue}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          ABC を計算
        </button>

        <div className="mt-4 p-4 border rounded-lg bg-secondary-light">
          <p className="text-secondary italic">計算結果がここに表示されます</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4">登録</h2>

        <button
          type="button"
          disabled={true}
          className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          評価結果を登録
        </button>
      </section>
    </main>
  );
}


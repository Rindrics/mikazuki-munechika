"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  has資源アクセス権限,
  認証済評価担当者,
  認証済資源評価管理者,
  資源名,
  ABC算定結果,
  is主担当者,
  is副担当者,
} from "@/domain";
import type { VersionedAssessmentResult } from "@/domain/repositories";
import { type 評価ステータス, can保存評価結果 } from "@/domain/models/stock/status";
import ErrorCard from "@/components/error-card";
import { StatusPanel } from "@/components/organisms";
import { StatusChangeButton, VersionHistory } from "@/components/molecules";
import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  calculateAbcAction,
  saveAssessmentResultAction,
  requestInternalReviewAction,
  cancelInternalReviewAction,
  getAssessmentStatusAction,
  startWorkAction,
  approveInternalReviewAction,
  publishExternallyAction,
  getVersionHistoryAction,
  getPublicationHistoryAction,
} from "./actions";

interface AssessmentPageProps {
  params: Promise<{ stockGroupName: string }>;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const { stockGroupName: encodedName } = use(params);
  const stockGroupName = decodeURIComponent(encodedName) as 資源名;

  const { user, isLoading } = useAuth();

  const [catchDataValue, set漁獲量データValue] = useState("");
  const [biologicalDataValue, set生物学的データValue] = useState("");
  const [calculationResult, setCalculationResult] = useState<ABC算定結果 | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [isNewVersion, setIsNewVersion] = useState<boolean>(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<評価ステータス>("未着手");
  const [_isStatusLoading, setIsStatusLoading] = useState(true);

  // Version history state (ADR 0018)
  const [versionHistory, setVersionHistory] = useState<VersionedAssessmentResult[]>([]);
  const [publications, setPublications] = useState<
    Array<{ revisionNumber: number; internalVersion: number; publishedAt: Date }>
  >([]);
  const [approvedVersion, _setApprovedVersion] = useState<number | undefined>();

  // Fetch version history
  const fetchVersionHistory = useCallback(async () => {
    try {
      const [versions, pubs] = await Promise.all([
        getVersionHistoryAction(stockGroupName),
        getPublicationHistoryAction(stockGroupName),
      ]);
      setVersionHistory(versions);
      setPublications(pubs);
    } catch (error) {
      console.error("Failed to fetch version history:", error);
    }
  }, [stockGroupName]);

  // Check if user is primary assignee for this stock
  const isPrimaryAssignee =
    user &&
    (user as 認証済評価担当者).種別 === "評価担当者" &&
    is主担当者(user as 認証済評価担当者, stockGroupName);

  // Check if user is secondary assignee for this stock
  const isSecondaryAssignee =
    user &&
    (user as 認証済評価担当者).種別 === "評価担当者" &&
    is副担当者(user as 認証済評価担当者, stockGroupName);

  // Check if user is administrator
  const is管理者 =
    user && (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者";

  // Fetch initial status from server and auto-start work for primary assignee
  useEffect(() => {
    const fetchAndMaybeStartWork = async () => {
      try {
        // For primary assignees, auto-start work (changes "未着手" to "作業中")
        if (isPrimaryAssignee) {
          const result = await startWorkAction(stockGroupName);
          setCurrentStatus(result.newStatus);
        } else {
          const status = await getAssessmentStatusAction(stockGroupName);
          setCurrentStatus(status);
        }
        // Fetch version history after status is loaded
        await fetchVersionHistory();
      } catch (error) {
        console.error("Failed to fetch/update status:", error);
      } finally {
        setIsStatusLoading(false);
      }
    };

    // Only run when user is loaded
    if (!isLoading && user) {
      fetchAndMaybeStartWork();
    }
  }, [stockGroupName, isPrimaryAssignee, isLoading, user, fetchVersionHistory]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setIsSaved(false);
    setSaveError(null);
    try {
      const result = await calculateAbcAction(stockGroupName, catchDataValue, biologicalDataValue);
      setCalculationResult(result);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!calculationResult) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const { version, isNew } = await saveAssessmentResultAction(
        stockGroupName,
        calculationResult,
        catchDataValue,
        biologicalDataValue
      );
      setIsSaved(true);
      setSavedVersion(version);
      setIsNewVersion(isNew);
      // Refresh version history after save
      await fetchVersionHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "登録に失敗しました";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

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
  const hasPermission = has資源アクセス権限(
    user as 認証済評価担当者 | 認証済資源評価管理者,
    stockGroupName
  );

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

      {/* Sticky header: Title + Status + Actions */}
      <div className="sticky top-0 bg-background dark:bg-background-dark py-4 -mx-8 px-8 z-10 border-b border-secondary-light dark:border-secondary-dark mb-8">
        <h1 className="mb-1">{stockGroupName}</h1>
        <p className="text-secondary text-sm mb-3">
          権限:{" "}
          <span className="font-medium">
            {(user as 認証済評価担当者 | 認証済資源評価管理者).種別 === "資源評価管理者"
              ? "管理者"
              : ((user as 認証済評価担当者).担当資源情報リスト[stockGroupName] ?? "担当")}
          </span>
        </p>

        <StatusPanel status={currentStatus}>
          {/* Status change buttons for primary assignee */}
          {isPrimaryAssignee && (
            <>
              {currentStatus === "作業中" && (
                <StatusChangeButton
                  label="内部査読を依頼"
                  confirmTitle="内部査読を依頼しますか？"
                  confirmMessage="内部査読を依頼すると、副担当者・管理者に通知されます。"
                  variant="primary"
                  onAction={async () => {
                    const result = await requestInternalReviewAction(stockGroupName);
                    if (result.success) {
                      setCurrentStatus(result.newStatus);
                    }
                  }}
                />
              )}
              {currentStatus === "内部査読中" && (
                <StatusChangeButton
                  label="内部査読依頼を取り消す"
                  confirmTitle="内部査読依頼を取り消しますか？"
                  confirmMessage="取り消すと、ステータスが「作業中」に戻ります。"
                  variant="secondary"
                  onAction={async () => {
                    const result = await cancelInternalReviewAction(stockGroupName);
                    if (result.success) {
                      setCurrentStatus(result.newStatus);
                    }
                  }}
                />
              )}
            </>
          )}
          {/* Status change buttons for secondary assignee */}
          {isSecondaryAssignee && currentStatus === "内部査読中" && (
            <StatusChangeButton
              label="承諾する"
              confirmTitle="内部査読を承諾しますか？"
              confirmMessage="承諾すると、ステータスが「外部公開可能」になります。"
              variant="success"
              onAction={async () => {
                const result = await approveInternalReviewAction(stockGroupName);
                if (result.success) {
                  setCurrentStatus(result.newStatus);
                }
              }}
            />
          )}
          {/* Status change buttons for administrator */}
          {is管理者 && currentStatus === "外部公開可能" && (
            <StatusChangeButton
              label="外部公開する"
              confirmTitle="外部公開しますか？"
              confirmMessage="外部公開すると、ステークホルダーによる査読が開始されます。"
              variant="primary"
              onAction={async () => {
                const result = await publishExternallyAction(stockGroupName);
                if (result.success) {
                  setCurrentStatus(result.newStatus);
                }
              }}
            />
          )}
        </StatusPanel>
      </div>

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
              onChange={(e) => set漁獲量データValue(e.target.value)}
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
              onChange={(e) => set生物学的データValue(e.target.value)}
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
          onClick={handleCalculate}
          disabled={!catchDataValue || !biologicalDataValue || isCalculating}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? "計算中..." : "ABC を計算"}
        </button>

        <div className="mt-4 p-4 border rounded-lg bg-secondary-light">
          {calculationResult ? (
            <div>
              <p className="font-medium mb-1">計算結果:</p>
              <p>{calculationResult.value}</p>
            </div>
          ) : (
            <p className="text-secondary italic">計算結果がここに表示されます</p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">登録</h2>

        <button
          type="button"
          onClick={handleSave}
          disabled={!calculationResult || isSaving || isSaved || !can保存評価結果(currentStatus)}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-success-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "登録中..." : isSaved ? "登録済み" : "評価結果を登録"}
        </button>

        {isSaved && savedVersion !== null && (
          <p className="mt-4 text-success font-medium">
            {isNewVersion
              ? `評価結果を v${savedVersion} として登録しました。`
              : `既存バージョン (v${savedVersion}) と同じパラメータです。`}
          </p>
        )}

        {saveError && (
          <div className="mt-2 p-2 border border-danger rounded-lg bg-danger-light dark:bg-danger-hover ">
            <p className="text-danger-dark font-medium dark:text-foreground-dark">
              結果の登録に失敗しました
            </p>
          </div>
        )}
      </section>

      {/* Version History (ADR 0018) */}
      <section>
        <h2 className="mb-4">バージョン履歴</h2>
        <VersionHistory
          versions={versionHistory}
          publications={publications}
          currentApprovedVersion={approvedVersion}
        />
      </section>
    </main>
  );
}

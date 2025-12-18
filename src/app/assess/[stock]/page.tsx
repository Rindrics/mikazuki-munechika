"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  has資源アクセス権限,
  認証済評価担当者,
  認証済資源評価管理者,
  ABC算定結果,
  is主担当者,
  is副担当者,
  get資源名BySlug,
} from "@/domain";
import type { VersionedAssessmentResult, PublicationRecord } from "@/domain/repositories";
import { type 評価ステータス, can保存評価結果 } from "@/domain/models/stock/status";
import ErrorCard from "@/components/error-card";
import AuthModal from "@/components/auth-modal";
import { StatusPanel } from "@/components/organisms";
import {
  StatusChangeButton,
  VersionHistory,
  ButtonGroup,
  ConfirmDialog,
} from "@/components/molecules";
import { Button } from "@/components/atoms";
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
  cancelApprovalAction,
  requestReconsiderationAction,
  publishExternallyAction,
  stopExternalPublicationAction,
  getVersionHistoryAction,
  getPublicationHistoryAction,
} from "./actions";

interface AssessmentPageProps {
  params: Promise<{ stock: string }>;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const { stock: slug } = use(params);
  const stockGroupName = get資源名BySlug(slug);

  const { user, isLoading } = useAuth();

  // All hooks must be called before any conditional returns (Rules of Hooks)
  const [catchDataValue, set漁獲量データValue] = useState("");
  const [biologicalDataValue, set生物学的データValue] = useState("");
  const [calculationResult, setCalculationResult] = useState<ABC算定結果 | null>(null);
  // Track parameters used for current calculation to ensure consistency
  const [calculatedParams, setCalculatedParams] = useState<{
    catchData: string;
    biologicalData: string;
  } | null>(null);
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
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [approvedVersion, setApprovedVersion] = useState<number | undefined>();
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Warning dialog for version mismatch (shared between approval and publication)
  const [isVersionMismatchWarningOpen, setIsVersionMismatchWarningOpen] = useState(false);
  const [versionMismatchAction, setVersionMismatchAction] = useState<"approve" | "publish" | null>(
    null
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation dialog for external publication (when versions match)
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

  // Load version data into form fields
  const loadVersionIntoForm = useCallback((version: VersionedAssessmentResult) => {
    setSelectedVersion(version.version);
    const catchData = version.parameters?.catchData?.value ?? "";
    const biologicalData = version.parameters?.biologicalData?.value ?? "";
    set漁獲量データValue(catchData);
    set生物学的データValue(biologicalData);
    if (version.result) {
      setCalculationResult(version.result);
      // For loaded versions, parameters are already consistent with result
      setCalculatedParams({ catchData, biologicalData });
    }
    // Reset save state when switching versions
    setIsSaved(false);
    setSavedVersion(null);
  }, []);

  // Fetch version history and populate fields with appropriate version's parameters
  const fetchVersionHistory = useCallback(
    async (targetApprovedVersion?: number) => {
      // Guard against null stockGroupName (invalid slug case)
      if (!stockGroupName) return;

      try {
        const [versions, pubs] = await Promise.all([
          getVersionHistoryAction(stockGroupName),
          getPublicationHistoryAction(stockGroupName),
        ]);
        setVersionHistory(versions);
        setPublications(pubs);

        if (versions.length > 0) {
          // If there's an approved/requested version, select it; otherwise select latest
          const versionToSelect = targetApprovedVersion
            ? versions.find((v) => v.version === targetApprovedVersion)
            : versions[0]; // versions are sorted by version desc

          if (versionToSelect) {
            loadVersionIntoForm(versionToSelect);
          }
        }
      } catch (error) {
        console.error("Failed to fetch version history:", error);
      }
    },
    [stockGroupName, loadVersionIntoForm]
  );

  // Check if user is primary assignee for this stock
  const isPrimaryAssignee =
    stockGroupName &&
    user &&
    (user as 認証済評価担当者).種別 === "評価担当者" &&
    is主担当者(user as 認証済評価担当者, stockGroupName);

  // Check if user is secondary assignee for this stock
  const isSecondaryAssignee =
    stockGroupName &&
    user &&
    (user as 認証済評価担当者).種別 === "評価担当者" &&
    is副担当者(user as 認証済評価担当者, stockGroupName);

  // Check if user is administrator
  const is管理者 =
    user && (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者";

  // Fetch initial status from server and auto-start work for primary assignee
  useEffect(() => {
    // Guard against null stockGroupName (invalid slug case)
    if (!stockGroupName) return;

    const fetchAndMaybeStartWork = async () => {
      try {
        let targetApprovedVersion: number | undefined;

        // For primary assignees, auto-start work (changes "未着手" to "作業中")
        if (isPrimaryAssignee) {
          const result = await startWorkAction(stockGroupName);
          setCurrentStatus(result.newStatus);
          // Fetch approved version separately
          const statusResult = await getAssessmentStatusAction(stockGroupName);
          setApprovedVersion(statusResult.approvedVersion);
          targetApprovedVersion = statusResult.approvedVersion;
        } else {
          const statusResult = await getAssessmentStatusAction(stockGroupName);
          setCurrentStatus(statusResult.status);
          setApprovedVersion(statusResult.approvedVersion);
          targetApprovedVersion = statusResult.approvedVersion;
        }
        // Fetch version history and select the target version (or latest if none)
        await fetchVersionHistory(targetApprovedVersion);
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
    if (!stockGroupName) return;
    setIsCalculating(true);
    setIsSaved(false);
    setSaveError(null);
    try {
      const result = await calculateAbcAction(stockGroupName, catchDataValue, biologicalDataValue);
      setCalculationResult(result);
      // Track the parameters used for this calculation
      setCalculatedParams({
        catchData: catchDataValue,
        biologicalData: biologicalDataValue,
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!stockGroupName || !calculationResult) return;
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

  // Handle approval action
  const handleApprove = async () => {
    if (!stockGroupName) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const result = await approveInternalReviewAction(stockGroupName);
      if (result.success) {
        setCurrentStatus(result.newStatus);
        setApprovedVersion(result.approvedVersion);
        setIsVersionMismatchWarningOpen(false);
        setVersionMismatchAction(null);
        // Refresh version history to reflect status changes
        await fetchVersionHistory(result.approvedVersion);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "承諾に失敗しました");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle publish action
  const handlePublish = async () => {
    if (!stockGroupName) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const result = await publishExternallyAction(stockGroupName);
      if (result.success) {
        setCurrentStatus(result.newStatus);
        // Close both dialogs on success
        setIsVersionMismatchWarningOpen(false);
        setVersionMismatchAction(null);
        setIsPublishConfirmOpen(false);
        // Refresh version history to show new publication record
        await fetchVersionHistory();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "外部公開に失敗しました");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle version mismatch action confirmation
  const handleVersionMismatchConfirm = async () => {
    if (versionMismatchAction === "approve") {
      await handleApprove();
    } else if (versionMismatchAction === "publish") {
      await handlePublish();
    }
  };

  // Navigate to submitted/approved version
  const goToSubmittedVersion = () => {
    if (approvedVersion) {
      const submittedVersion = versionHistory.find((v) => v.version === approvedVersion);
      if (submittedVersion) {
        loadVersionIntoForm(submittedVersion);
      }
    }
    setIsVersionMismatchWarningOpen(false);
    setVersionMismatchAction(null);
  };

  // Invalid slug - show 404-like error (after all hooks are called)
  if (!stockGroupName) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <ErrorCard title="資源が見つかりません（404）">
          <p className="mb-4">指定された資源は存在しません: {slug}</p>
          <Link href="/assess" className="underline hover:opacity-80">
            担当資源一覧に戻る
          </Link>
        </ErrorCard>
      </main>
    );
  }

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
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="text-primary underline hover:opacity-80"
          >
            ログイン
          </button>
          してください
        </p>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
    <main className="p-8 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/assess" className="text-link hover:text-link-hover underline text-sm">
          ← {is管理者 ? "管理中の資源" : "担当中の資源"}に戻る
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
              {(currentStatus === "作業中" || currentStatus === "再検討中") && selectedVersion && (
                <StatusChangeButton
                  label="内部査読を依頼"
                  confirmTitle="内部査読を依頼しますか？"
                  confirmMessage={`v${selectedVersion} の結果で内部査読を依頼します。副担当者・管理者に通知されます。`}
                  variant="primary"
                  onAction={async () => {
                    const result = await requestInternalReviewAction(
                      stockGroupName,
                      selectedVersion
                    );
                    if (result.success) {
                      setCurrentStatus(result.newStatus);
                      setApprovedVersion(result.requestedVersion);
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
            <ButtonGroup direction="horizontal">
              {selectedVersion && (
                <StatusChangeButton
                  label="再検討を依頼"
                  confirmTitle="再検討を依頼しますか？"
                  confirmMessage={`v${selectedVersion} の結果について再検討を依頼します。主担当者に通知されます。`}
                  variant="secondary"
                  onAction={async () => {
                    const result = await requestReconsiderationAction(
                      stockGroupName,
                      selectedVersion
                    );
                    if (result.success) {
                      setCurrentStatus(result.newStatus);
                    }
                  }}
                />
              )}
              <Button
                variant="success"
                onClick={() => {
                  // Clear any previous errors when opening dialog
                  setActionError(null);
                  // Check if selected version differs from submitted version
                  if (selectedVersion !== approvedVersion) {
                    setVersionMismatchAction("approve");
                    setIsVersionMismatchWarningOpen(true);
                  } else {
                    // Directly approve if versions match
                    handleApprove();
                  }
                }}
              >
                承諾する
              </Button>
            </ButtonGroup>
          )}
          {/* Cancel approval button for secondary assignee or administrator */}
          {(isSecondaryAssignee || is管理者) && currentStatus === "外部公開可能" && (
            <StatusChangeButton
              label="承諾取り消し"
              confirmTitle="承諾を取り消しますか？"
              confirmMessage="承諾を取り消すと、ステータスが「内部査読中」に戻ります。"
              variant="secondary"
              onAction={async () => {
                const result = await cancelApprovalAction(stockGroupName);
                if (result.success) {
                  setCurrentStatus(result.newStatus);
                  // Keep approvedVersion to show "内部査読中" label on the version
                }
              }}
            />
          )}
          {/* Status change buttons for administrator */}
          {is管理者 && currentStatus === "外部公開可能" && (
            <Button
              variant="primary"
              onClick={() => {
                // Clear any previous errors when opening dialog
                setActionError(null);
                // Check if selected version differs from approved version
                if (selectedVersion !== approvedVersion) {
                  setVersionMismatchAction("publish");
                  setIsVersionMismatchWarningOpen(true);
                } else {
                  // Show confirmation dialog when versions match
                  setIsPublishConfirmOpen(true);
                }
              }}
            >
              外部公開する
            </Button>
          )}
          {is管理者 && currentStatus === "外部査読中" && (
            <StatusChangeButton
              label="公開停止"
              confirmTitle="外部公開を停止しますか？"
              confirmMessage="公開停止すると、ステータスが「外部公開可能」に戻ります。"
              variant="secondary"
              onAction={async () => {
                const result = await stopExternalPublicationAction(stockGroupName);
                if (result.success) {
                  setCurrentStatus(result.newStatus);
                }
              }}
            />
          )}
        </StatusPanel>
      </div>

      {/* Two-column layout: Main content (left) + Version history (right) */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column: Main content */}
        <div className="flex-1 min-w-0">
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
              disabled={
                !calculationResult ||
                isSaving ||
                isSaved ||
                !can保存評価結果(currentStatus) ||
                // Ensure parameters match the calculated result
                !calculatedParams ||
                calculatedParams.catchData !== catchDataValue ||
                calculatedParams.biologicalData !== biologicalDataValue
              }
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-success-hover disabled:bg-disabled disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "登録中..." : isSaved ? "登録済み" : "評価結果を登録"}
            </button>

            {calculationResult &&
              calculatedParams &&
              (calculatedParams.catchData !== catchDataValue ||
                calculatedParams.biologicalData !== biologicalDataValue) && (
                <p className="mt-2 text-secondary text-sm">
                  パラメータが変更されました。登録するには再計算してください。
                </p>
              )}

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
        </div>

        {/* Right column: Version history (sticky on large screens) */}
        <aside className="lg:w-80 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-32">
            <h2 className="mb-4">バージョン履歴</h2>
            <VersionHistory
              versions={versionHistory}
              publications={publications}
              currentApprovedVersion={approvedVersion}
              currentStatus={currentStatus}
              selectedVersion={selectedVersion}
              onSelectVersion={loadVersionIntoForm}
            />
          </div>
        </aside>
      </div>

      {/* Warning dialog for version mismatch when approving or publishing */}
      <ConfirmDialog
        isOpen={isVersionMismatchWarningOpen}
        title="選択中のバージョンが異なります"
        message={
          <div className="space-y-4">
            <p>
              現在選択中のバージョン（v{selectedVersion ?? "-"}）は、
              {versionMismatchAction === "approve" ? "提出された" : "内部承諾済みの"}
              バージョン（v{approvedVersion ?? "-"}）と異なります。
            </p>
            <p>
              {versionMismatchAction === "approve"
                ? "提出されたバージョンで承諾しますか？"
                : "内部承諾済みのバージョンで外部公開しますか？"}
            </p>
          </div>
        }
        confirmLabel={
          versionMismatchAction === "approve"
            ? "提出されたバージョンで承諾"
            : "内部承諾済みバージョンで公開"
        }
        confirmVariant={versionMismatchAction === "approve" ? "success" : "primary"}
        onConfirm={handleVersionMismatchConfirm}
        onCancel={() => {
          setIsVersionMismatchWarningOpen(false);
          setVersionMismatchAction(null);
          setActionError(null);
        }}
        isLoading={isActionLoading}
        errorMessage={actionError}
        neutralLabel={approvedVersion ? `v${approvedVersion} を確認` : undefined}
        onNeutral={approvedVersion ? goToSubmittedVersion : undefined}
      />

      {/* Confirmation dialog for external publication (when versions match) */}
      <ConfirmDialog
        isOpen={isPublishConfirmOpen}
        title="外部公開しますか？"
        message="外部公開すると、ステークホルダーによる査読が開始されます。"
        confirmLabel="外部公開する"
        confirmVariant="primary"
        onConfirm={handlePublish}
        onCancel={() => {
          setIsPublishConfirmOpen(false);
          setActionError(null);
        }}
        isLoading={isActionLoading}
        errorMessage={actionError}
      />
    </main>
  );
}

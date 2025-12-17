"use client";

import type { VersionedAssessmentResult, PublicationRecord } from "@/domain/repositories";
import type { 評価ステータス } from "@/domain/models/stock/status";

// Statuses where the approved version is actually "approved" (not just "under review")
const 承諾済みステータス: 評価ステータス[] = ["外部公開可能", "外部査読中", "外部査読受理済み"];

interface VersionHistoryProps {
  versions: VersionedAssessmentResult[];
  publications?: PublicationRecord[];
  currentApprovedVersion?: number;
  currentStatus?: 評価ステータス;
  selectedVersion?: number;
  onSelectVersion?: (version: VersionedAssessmentResult) => void;
  className?: string;
}

/**
 * Display version history for assessment results (ADR 0018)
 */
export function VersionHistory({
  versions,
  publications = [],
  currentApprovedVersion,
  currentStatus,
  selectedVersion,
  onSelectVersion,
  className = "",
}: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className={`p-4 border rounded-lg bg-secondary-light ${className}`}>
        <p className="text-secondary italic">バージョン履歴がありません</p>
      </div>
    );
  }

  // Create a map of internal version -> publication info
  const publicationMap = new Map(publications.map((pub) => [pub.internalVersion, pub]));

  // "承諾済み" label should only show when the status indicates actual approval
  // (not just "under review" which is "内部査読中")
  const isActuallyApproved = currentStatus && 承諾済みステータス.includes(currentStatus);

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="divide-y max-h-64 overflow-y-auto">
        {versions.map((v) => {
          const publication = publicationMap.get(v.version);
          const isApproved = isActuallyApproved && v.version === currentApprovedVersion;
          const isSelected = v.version === selectedVersion;

          return (
            <button
              type="button"
              key={v.version}
              onClick={() => onSelectVersion?.(v)}
              className={`w-full p-3 flex items-center justify-between text-left hover:bg-secondary-light/50 transition-colors ${
                isApproved ? "bg-success-light/30" : ""
              } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">v{v.version}</span>
                {isSelected && (
                  <span className="text-xs px-2 py-0.5 bg-primary text-white rounded-full">
                    選択中
                  </span>
                )}
                {isApproved && (
                  <span className="text-xs px-2 py-0.5 bg-success text-white rounded-full">
                    承諾済み
                  </span>
                )}
                {publication && (
                  <span className="text-xs px-2 py-0.5 bg-secondary text-white rounded-full">
                    公開済み (改訂{publication.revisionNumber})
                  </span>
                )}
              </div>
              <div className="text-sm text-secondary">{formatDate(v.createdAt)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Memoize the formatter instance for performance
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

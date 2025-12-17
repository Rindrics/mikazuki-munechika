"use client";

import type { VersionedAssessmentResult } from "@/domain/repositories";

interface PublicationRecord {
  revisionNumber: number;
  internalVersion: number;
  publishedAt: Date;
}

interface VersionHistoryProps {
  versions: VersionedAssessmentResult[];
  publications?: PublicationRecord[];
  currentApprovedVersion?: number;
  className?: string;
}

/**
 * Display version history for assessment results (ADR 0018)
 */
export function VersionHistory({
  versions,
  publications = [],
  currentApprovedVersion,
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
  const publicationMap = new Map(
    publications.map((pub) => [pub.internalVersion, pub])
  );

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="p-3 bg-secondary-light border-b">
        <h3 className="font-medium">バージョン履歴</h3>
      </div>
      <div className="divide-y max-h-64 overflow-y-auto">
        {versions.map((v) => {
          const publication = publicationMap.get(v.version);
          const isApproved = v.version === currentApprovedVersion;

          return (
            <div
              key={v.version}
              className={`p-3 flex items-center justify-between ${
                isApproved ? "bg-success-light/30" : ""
              }`}
            >
              <div>
                <span className="font-medium">v{v.version}</span>
                {isApproved && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-success text-white rounded-full">
                    承諾済み
                  </span>
                )}
                {publication && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-primary text-white rounded-full">
                    公開済み (改訂{publication.revisionNumber})
                  </span>
                )}
              </div>
              <div className="text-sm text-secondary">
                {formatDate(v.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


import Link from "next/link";
import { 資源グループs } from "@/domain/constants";

/**
 * 資源一覧ページ
 *
 * 全資源のリストを呼称別に階層表示する
 */
export default function ReferenceListPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="mb-6">評価対象資源の基本情報</h1>

      <section className="mb-8">
        <ul className="space-y-6">
          {Object.entries(資源グループs).map(([groupKey, groupData]) => (
            <li key={groupKey}>
              <h2 className="text-lg font-bold mb-2">{groupData.呼称}</h2>
              <ul className="ml-4 space-y-2">
                {Object.entries(groupData.系群).map(([regionKey, regionInfo]) => (
                  <li key={regionKey}>
                    <Link
                      href={`/reference/${regionInfo.slug}`}
                      className="flex items-center justify-between p-3 bg-secondary-light dark:bg-secondary-dark rounded-lg hover:bg-secondary dark:hover:bg-secondary transition-colors"
                    >
                      <span className="font-medium">{regionInfo.系群名}</span>
                      <span className="text-secondary text-sm">{regionInfo.資源タイプ} 系資源</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

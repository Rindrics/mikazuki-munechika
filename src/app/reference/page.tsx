import Link from "next/link";
import { 資源グループs } from "@/domain/constants";

/**
 * 資源一覧ページ
 *
 * 全資源のリストを表示する
 */
export default function ReferenceListPage() {
  // Build a flat list of all stocks from 資源グループs
  const allStocks = Object.entries(資源グループs).flatMap(([_groupKey, groupData]) =>
    Object.entries(groupData.系群).map(([_regionKey, regionInfo]) => ({
      呼称: groupData.呼称,
      系群名: regionInfo.系群名,
      資源タイプ: regionInfo.資源タイプ,
      slug: regionInfo.slug,
      displayName: regionInfo.系群名 ? `${groupData.呼称} ${regionInfo.系群名}` : groupData.呼称,
    }))
  );

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="mb-6">資源リファレンス</h1>

      <section className="mb-8">
        <p className="text-secondary mb-4">
          各資源の詳細情報と計算ロジックを確認できます。
        </p>

        <ul className="space-y-2">
          {allStocks.map((stock) => (
            <li key={stock.slug}>
              <Link
                href={`/reference/${stock.slug}`}
                className="flex items-center justify-between p-4 bg-secondary-light dark:bg-secondary-dark rounded-lg hover:bg-secondary dark:hover:bg-secondary transition-colors"
              >
                <span className="font-medium">{stock.displayName}</span>
                <span className="text-secondary text-sm">
                  {stock.資源タイプ} 系資源
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { get資源名BySlug, create資源情報 } from "@/domain";
import ErrorCard from "@/components/error-card";
import Link from "next/link";

interface ReferencePageProps {
  params: Promise<{ stock: string }>;
}

/**
 * 資源リファレンスページ
 *
 * 各資源の詳細情報を表示する
 */
export default async function ReferencePage({ params }: ReferencePageProps) {
  const { stock: slug } = await params;
  const stockGroupName = get資源名BySlug(slug);

  // Invalid slug - show 404-like error
  if (!stockGroupName) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <ErrorCard title="資源が見つかりません（404）">
          <p className="mb-4">指定された資源は存在しません: {slug}</p>
          <Link href="/reference" className="underline hover:opacity-80">
            資源一覧に戻る
          </Link>
        </ErrorCard>
      </main>
    );
  }

  const stockInfo = create資源情報(stockGroupName);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/reference" className="text-link hover:text-link-hover underline text-sm">
          ← 資源一覧に戻る
        </Link>
      </div>

      <h1 className="mb-6">{stockInfo.toDisplayString()}</h1>

      <section className="mb-8">
        <h2 className="mb-4">基本情報</h2>
        <dl className="grid grid-cols-2 gap-4 bg-secondary-light dark:bg-secondary-dark p-4 rounded-lg">
          <div>
            <dt className="text-secondary text-sm">呼称</dt>
            <dd className="font-medium">{stockInfo.呼称}</dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">系群名</dt>
            <dd className="font-medium">{stockInfo.系群名 || "-"}</dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">資源タイプ</dt>
            <dd className="font-medium">{stockInfo.資源タイプ} 系資源</dd>
          </div>
          <div>
            <dt className="text-secondary text-sm">slug</dt>
            <dd className="font-mono text-sm">{stockInfo.slug}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

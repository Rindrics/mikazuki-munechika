export default function Home() {
  const todoItems = [
    { text: "評価結果一覧機能", href: "/dashboard", description: "ABC 算定結果を一覧表示する" },
    {
      text: "認証機能",
      href: "https://github.com/Rindrics/mikazuki-munechika/pull/24",
      description: "ロールに応じて表示・操作を制御する",
    },
    { text: "管理画面", href: undefined, description: "ユーザーの認可・権限管理を行う" },
    {
      text: "データ登録・資源量推定機能（ダミー版）",
      href: "/assess",
      description: "最新のデータを登録し、資量量推定結果をプレビューする",
    },
    {
      text: "将来予測・ABC 算定機能",
      href: undefined,
      description: "ABC 算定のための各種パラメータ調整を支援する",
    },
    {
      text: "執筆機能",
      href: undefined,
      description: "評価結果をもとに詳細版を執筆するための環境を提供する",
    },
    {
      text: "レビュー機能（第三者向け）",
      href: undefined,
      description: "詳細版の計算結果を公開データを使って検証するための環境を提供する",
    },
  ];

  return (
    <main className="ml-4 mt-4">
      <h1>資源評価 web</h1>
      <div className="ml-4 mt-4">
        <h3>開発 TODO リスト:</h3>
        <ul className="list-none space-y-2 ml-4 mt-4">
          {todoItems.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.href !== undefined}
                readOnly
                className="w-4 h-4 accent-success dark:accent-success"
              />
              {item.href ? (
                <a href={item.href} className="text-success hover:underline">
                  {item.text}
                </a>
              ) : (
                <span className="text-secondary-dark dark:text-secondary-hover">{item.text}</span>
              )}
              : <span className="text-secondary">{item.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

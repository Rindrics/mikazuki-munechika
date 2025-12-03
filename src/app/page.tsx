export default function Home() {
  const todoItems = [
    { text: "評価結果一覧", href: "/dashboard" },
    { text: "未実装の機能", href: undefined },
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
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              {item.href ? (
                <a href={item.href} className="text-blue-600 hover:underline">
                  {item.text}
                </a>
              ) : (
                <span className="text-gray-500">{item.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

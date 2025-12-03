import type { Metadata } from "next";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import "./globals.css";

export const metadata: Metadata = {
  title: "mikazuki-munechika",
  description: "資源評価業務アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <nav className="pr-8 py-2 bg-gray-100 flex items-center justify-end gap-8 text-md">
          <Link href="/">資源評価 web</Link>
          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/Rindrics/mikazuki-munechika/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <FaGithub className="w-5 h-5" />
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

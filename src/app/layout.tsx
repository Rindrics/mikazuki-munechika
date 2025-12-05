import type { Metadata } from "next";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { AuthProvider } from "@/contexts/auth-context";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "資源評価 web",
  description: "資源評価事業 web アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
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
        <div className="ml-4 my-2 text-sm text-gray-500">本アプリは一般有志による非公式なものです</div>
        </AuthProvider>
      </body>
    </html>
  );
}

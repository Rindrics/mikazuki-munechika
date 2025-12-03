import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}

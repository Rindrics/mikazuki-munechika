import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
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
    <html lang="ja" className="h-full">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="mx-auto my-4 text-sm text-secondary">
            本アプリは一般有志による非公式なものです
          </div>
          <div className="flex-1">{children}</div>
        </AuthProvider>
        <Footer />
      </body>
    </html>
  );
}

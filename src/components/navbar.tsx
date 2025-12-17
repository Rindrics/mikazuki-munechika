"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaUserCircle, FaCog } from "react-icons/fa";
import { useAuth } from "@/contexts/auth-context";
import type { 認証済資源評価管理者, 認証済評価担当者 } from "@/domain";
import AuthModal from "./auth-modal";
import { getCurrentFiscalYearAction } from "@/app/manage/actions";

export default function Navbar() {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<number | null>(null);

  // Fetch current fiscal year
  useEffect(() => {
    const fetchYear = async () => {
      try {
        const year = await getCurrentFiscalYearAction();
        setCurrentFiscalYear(year);
      } catch {
        // Ignore errors (user may not be logged in)
      }
    };
    fetchYear();
  }, []);

  const is資源評価管理者 =
    user &&
    (user as 認証済資源評価管理者 | 認証済評価担当者).種別 === "資源評価管理者";

  return (
    <>
      <nav className="px-8 py-2 bg-secondary-light text-secondary-dark dark:bg-secondary-dark dark:text-secondary-hover flex items-center justify-between text-md">
        <Link className="hover:text-fg-secondary hover:underline cursor-pointer" href="/">
          資源評価 web
        </Link>
        <div className="flex items-center gap-4">
          {is資源評価管理者 && (
            <Link
              href="/manage"
              className="flex items-center gap-1 hover:text-fg-secondary hover:underline cursor-pointer"
            >
              <FaCog className="w-4 h-4" />
              <span>管理</span>
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-4">
              {currentFiscalYear && (
                <span className="px-2 py-1 text-sm bg-primary text-white rounded">
                  {currentFiscalYear}年度
                </span>
              )}
              <div className="gap-1 inline-flex items-center relative group">
                <FaUserCircle className="w-5 h-5 cursor-pointer" />
                <div
                  role="tooltip"
                  className="absolute top-full right-0 mt-2 px-2 py-1 text-xs text-background bg-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-foreground"
                >
                  <span className="font-mono">{user.メールアドレス}</span>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hover:text-fg-secondary hover:underline cursor-pointer"
                >
                  ログアウト
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className=" hover:text-fg-secondary hover:underline cursor-pointer"
            >
              ログイン
            </button>
          )}
        </div>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}

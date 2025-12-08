"use client";

import { useState } from "react";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "@/contexts/auth-context";
import AuthModal from "./auth-modal";

export default function Navbar() {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <nav className="pr-8 py-2 bg-secondary-light text-secondary-dark dark:bg-secondary-dark dark:text-secondary-hover flex items-center justify-end gap-8 text-md">
        <Link className="hover:text-fg-secondary hover:underline cursor-pointer" href="/">
          資源評価 web
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <span className="gap-2">
              <div className="gap-1 inline-flex items-center relative group mt-1">
                <FaUserCircle className="w-5 h-5 cursor-pointer" />
                <div
                  role="tooltip"
                  className="absolute top-full right-0 mt-2 px-2 py-1 text-xs text-background bg-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-foreground"
                >
                  <span className="font-mono">{user.email}</span>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hover:text-fg-secondary hover:underline cursor-pointer"
                >
                  ログアウト
                </button>
              </div>
            </span>
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

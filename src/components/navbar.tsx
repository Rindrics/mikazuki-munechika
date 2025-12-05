"use client";

import { useState } from "react";
import Link from "next/link";
import { FaGithub, FaUserCircle } from "react-icons/fa";
import { useAuth } from "@/contexts/auth-context";
import AuthModal from "./auth-modal";

export default function Navbar() {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <nav className="pr-8 py-2 bg-bg-navbar flex items-center justify-end gap-8 text-md">
        <Link className="hover:text-fg-secondary hover:underline cursor-pointer" href="/">資源評価 web</Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="relative group">
                <FaUserCircle className="w-5 h-5 cursor-pointer" />
                <div
                  role="tooltip"
                  className={[
                    "absolute",
                    "bottom-full",
                    "right-0",
                    "mb-2",
                    "px-2",
                    "py-1",
                    "text-xs",
                    "text-white",
                    "bg-black",
                    "rounded",
                    "opacity-0",
                    "group-hover:opacity-100",
                    "transition-opacity",
                    "duration-200",
                    "pointer-events-none",
                    "whitespace-nowrap",
                    // Triangle pointing down (towards the icon)
                    "before:content-['']",
                    "before:absolute",
                    "before:bottom-full",
                    "before:left-1/2",
                    "before:-translate-x-1/2",
                    "before:border-4",
                    "before:border-transparent",
                    "before:border-t-black",
                  ].join(" ")}
                >
                  Logged in as {user.email}
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className=" hover:text-fg-secondary hover:underline cursor-pointer"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className=" hover:text-fg-secondary hover:underline cursor-pointer"
            >
              ログイン
            </button>
          )}
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
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

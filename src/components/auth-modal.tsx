"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { get担当資源情報s, 認証済評価担当者, 認証済資源評価管理者 } from "@/domain";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getロール表示リスト(user: 認証済評価担当者 | 認証済資源評価管理者): { key: string; label: string }[] {
  if (user.種別 === "評価担当者") {
    return get担当資源情報s(user).map((info) => ({
      key: info.担当資源名,
      label: `${info.担当資源名} - ${info.ロール}`,
    }));
  }
  return [{ key: "admin", label: user.ロール }];
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = await login(email, password);
    if (success) {
      setEmail("");
      setPassword("");
      onClose();
    } else {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    }
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {user ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-maintext">ログアウト</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>メールアドレス:</strong> {user.メールアドレス}
              </p>
              <div className="text-sm text-gray-600">
                <strong>ロール:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  {getロール表示リスト(user as 認証済評価担当者 | 認証済資源評価管理者).map(({ key, label }) => (
                    <li key={key}>{label}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 bg-danger text-white px-4 py-2 rounded hover:bg-danger-dark"
              >
                ログアウト
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4 text-maintext">ログイン</h2>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-maintext mb-1">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-maintext border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="example@example.com"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-maintext mb-1">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-maintext border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="パスワード"
                />
              </div>
              {error && (
                <div className="mb-4 p-3 bg-danger-light text-danger-dark dark:bg-danger-dark dark:text-danger-hover rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "ログイン中..." : "ログイン"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { 認証済ユーザー, ユーザーRepository, getUserId } from "@/domain";
import { createユーザーRepository } from "@/infrastructure";
import { logger } from "@/utils/logger";

interface AuthContextType {
  user: 認証済ユーザー | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setユーザー] = useState<認証済ユーザー | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRepository = useMemo<ユーザーRepository>(() => createユーザーRepository(), []);

  useEffect(() => {
    const initializeAuth = async () => {
      // Get current user from repository
      const currentユーザー = await userRepository.getCurrentユーザー();
      setユーザー(currentユーザー);
      setIsLoading(false);

      // Subscribe to auth state changes
      // onAuthStateChange() call itself subscribes to changes
      // and returns an unsubscribe function for cleanup
      const unsubscribe = userRepository.onAuthStateChange((newユーザー) => {
        setユーザー(newユーザー);
      });

      // Return cleanup function to unsubscribe when component unmounts
      return unsubscribe;
    };

    initializeAuth();
  }, [userRepository]);

  const login = async (email: string, password: string): Promise<boolean> => {
    logger.debug("Login attempt", { email });

    try {
      // do not use withLogger here to avoid logging the email-password pair
      const authenticatedユーザー = await userRepository.authenticate(email, password);
      if (!authenticatedユーザー) {
        logger.debug("Login failed: invalid credentials", { email });
        return false;
      }
      logger.setContext({ userId: getUserId(authenticatedユーザー) });
      logger.info("Login successful", { email });
      setユーザー(authenticatedユーザー);
      return true;
    } catch (error) {
      logger.error("Login failed", { email }, error as Error);
      throw error;
    }
  };

  const logout = async () => {
    const userId = user ? getUserId(user) : undefined;
    logger.debug("Logout attempt", userId ? { userId } : undefined);

    try {
      await userRepository.logout();
      logger.setContext({ userId: undefined });
      logger.info("Logout successful", userId ? { userId } : undefined);
      setユーザー(null);
    } catch (error) {
      logger.error("Logout failed", userId ? { userId } : undefined, error as Error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

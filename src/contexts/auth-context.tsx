"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { AuthenticatedUser, UserRepository } from "@/domain";
import { createUserRepository } from "@/infrastructure";
import { logger, withLogger } from "@/utils/logger";

interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRepository = useMemo<UserRepository>(() => createUserRepository(), []);

  // Set service name in logger context
  useEffect(() => {
    logger.setContext({ service: "auth" });
    return () => {
      logger.clearContext();
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      // Get current user from repository
      const currentUser = await userRepository.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);

      // Subscribe to auth state changes
      // onAuthStateChange() call itself subscribes to changes
      // and returns an unsubscribe function for cleanup
      const unsubscribe = userRepository.onAuthStateChange((newUser) => {
        setUser(newUser);
      });

      // Return cleanup function to unsubscribe when component unmounts
      return unsubscribe;
    };

    initializeAuth();
  }, [userRepository]);

  const login = async (email: string, password: string): Promise<boolean> => {
    return await loginImpl(userRepository, setUser, email, password);
  };

  const logout = async () => {
    return await logoutImpl(userRepository, user, setUser);
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

const loginImpl = withLogger(
  "auth.login",
  async (
    userRepository: UserRepository,
    setUser: (user: AuthenticatedUser | null) => void,
    email: string,
    password: string
  ): Promise<boolean> => {
    const authenticatedUser = await userRepository.authenticate(email, password);
    if (!authenticatedUser) {
      logger.debug("Login failed: invalid credentials", { email });
      return false;
    }
    logger.setContext({ userId: authenticatedUser.id });
    logger.info("Login successful", { email });
    setUser(authenticatedUser);
    return true;
  }
);

const logoutImpl = withLogger(
  "auth.logout",
  async (
    userRepository: UserRepository,
    user: AuthenticatedUser | null,
    setUser: (user: AuthenticatedUser | null) => void
  ): Promise<void> => {
    const userId = user?.id;
    await userRepository.logout();
    logger.setContext({ userId: undefined });
    setUser(null);
  }
);

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { AuthenticatedUser, UserRepository } from "@/domain";
import { createUserRepository } from "@/infrastructure";

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
    const authenticatedUser = await userRepository.authenticate(email, password);
    if (!authenticatedUser) {
      return false;
    }

    setUser(authenticatedUser);
    return true;
  };

  const logout = async () => {
    await userRepository.logout();
    setUser(null);
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

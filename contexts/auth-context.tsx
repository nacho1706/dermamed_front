"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User, Role } from "@/types";
import { getMe, login as loginApi, logout as logoutApi } from "@/services/auth";
import { getToken, removeToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  activeRole: Role | null;
  setActiveRole: (role: Role) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRoleState] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasRole = useCallback(
    (roleName: string) => {
      return user?.roles?.some((r) => r.name === roleName) || false;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roleNames: string[]) => {
      return user?.roles?.some((r) => roleNames.includes(r.name)) || false;
    },
    [user],
  );

  const setActiveRole = useCallback((role: Role) => {
    setActiveRoleState(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeRole", JSON.stringify(role));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData);

      if (typeof window !== "undefined") {
        const storedRole = localStorage.getItem("activeRole");
        if (storedRole) {
          try {
            const parsed = JSON.parse(storedRole);
            if (userData.roles?.some((r: Role) => r.id === parsed.id)) {
              setActiveRoleState(parsed);
            } else {
              setActiveRoleState(userData.roles?.[0] || null);
            }
          } catch {
            setActiveRoleState(userData.roles?.[0] || null);
          }
        } else {
          setActiveRoleState(userData.roles?.[0] || null);
        }
      } else {
        setActiveRoleState(userData.roles?.[0] || null);
      }
    } catch {
      setUser(null);
      setActiveRoleState(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeRole");
      }
      removeToken();
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginApi({ email, password });
    setUser(response.user);
    if (response.user.roles?.length > 0) {
      setActiveRoleState(response.user.roles[0]);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "activeRole",
          JSON.stringify(response.user.roles[0]),
        );
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setActiveRoleState(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeRole");
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        hasRole,
        hasAnyRole,
      }}
    >
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

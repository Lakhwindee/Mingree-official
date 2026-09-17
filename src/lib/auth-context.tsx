import React, { createContext, useContext, useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  handle: string;
  role: "creator" | "sponsor" | "admin";
  avatar?: string | null;
  followers?: number;
  tier?: string;
  instagramUsername?: string | null;
  isInstagramVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  updateUserSession: (userData: Partial<AuthUser>) => void;
}

const AUTH_STORAGE_KEY = "mingree_auth_session_v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate or synchronize active session on initial boot
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed: AuthUser = JSON.parse(saved);
          if (isMounted) {
            setUser(parsed);
          }

          // If creator session is active, refresh dynamic Instagram/tier data in background
          if (parsed.role === "creator") {
            try {
              const res = await fetch("/api/users/current", { credentials: "include" });
              if (res.ok) {
                const data = await res.json();
                if (data && isMounted) {
                  const updated: AuthUser = {
                    ...parsed,
                    name: data.name || parsed.name,
                    handle: data.handle || parsed.handle,
                    followers: data.followers ?? parsed.followers,
                    tier: data.tier || parsed.tier,
                    instagramUsername: data.instagramUsername ?? parsed.instagramUsername,
                    isInstagramVerified: data.isInstagramVerified ?? parsed.isInstagramVerified,
                  };
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
                  setUser(updated);
                }
              }
            } catch {
              // Ignore background sync error
            }
          }
        } else {
          // No local session saved -> User is guest / logged out
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("Session check error:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData: Partial<AuthUser>) => {
    const updated: AuthUser = {
      id: userData.id || user?.id || 1,
      name: userData.name || user?.name || "Creator",
      email: userData.email || user?.email || "creator@mingree.com",
      handle: userData.handle || user?.handle || "@creator",
      role: userData.role || user?.role || "creator",
      avatar: userData.avatar ?? user?.avatar,
      followers: userData.followers ?? user?.followers ?? 0,
      tier: userData.tier || user?.tier || "New Creator",
      instagramUsername: userData.instagramUsername ?? user?.instagramUsername,
      isInstagramVerified: userData.isInstagramVerified ?? user?.isInstagramVerified ?? false,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
    setIsLoading(false);
  };

  const updateUserSession = (userData: Partial<AuthUser>) => {
    if (!user) return;
    const updated: AuthUser = { ...user, ...userData };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.clear();
      setUser(null);
      queryClient.clear();
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

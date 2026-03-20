"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin';
  isAdmin: boolean;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = () => {
      try {
        const storedUser = localStorage.getItem("userInfo");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && typeof parsed === 'object') {
            setUser(parsed);
          }
        }
      } catch (error) {
        console.error("Failed to parse stored user info:", error);
        localStorage.removeItem("userInfo");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("userInfo", JSON.stringify(userData));
    router.push("/");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userInfo");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

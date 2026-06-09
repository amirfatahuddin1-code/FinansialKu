"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createKarsafinAPI, getSupabaseClient, KarsafinAPI } from "@karsafin/shared";

interface User {
  id: string;
  email?: string;
  user_metadata?: { name?: string; phone?: string };
  email_confirmed_at?: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  api: KarsafinAPI;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, phone?: string, emailRedirectTo?: string) => Promise<{ error: any }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const supabase = getSupabaseClient();
const api = createKarsafinAPI(supabase);

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  api,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/faq",
  "/syarat-ketentuan",
  "/privacy.html",
  "/kontak-kami",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.auth.getSession();
        setUser(data?.session?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    const { data: listener } = api.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Route protection redirect logic
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route));

    if (!user && !isPublicRoute) {
      router.push("/login");
    } else if (user && (pathname === "/login" || pathname === "/")) {
      const hasPlan = typeof window !== "undefined" && window.location.search.includes("plan_id");
      if (pathname === "/login" && hasPlan) {
        // Let the login page render checkout/payment even if already logged in
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname, router]);

  const signIn = async (email: string, password: string) => {
    const { error } = await api.auth.signIn(email, password);
    if (!error) {
      // Re-fetch user session after successful login
      const { data } = await api.auth.getUser();
      setUser(data?.user ?? null);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, phone?: string, emailRedirectTo?: string) => {
    const { error } = await api.auth.signUp(email, password, name, phone, emailRedirectTo);
    return { error };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo || `${window.location.origin}/dashboard`,
        },
      });

      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Gagal login dengan Google" };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, api, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

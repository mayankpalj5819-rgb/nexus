"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

// Profile shape — matches our public.users table
export interface Profile {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  website: string | null;
  location: string | null;
  reputation: number;
  role: "user" | "moderator" | "admin";
  banned: boolean;
  joined_date: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Subscribe to auth changes
  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile whenever session changes
  React.useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let mounted = true;
    (async () => {
      // Wait for the trigger to create the profile row (sometimes the trigger
      // hasn't fired yet on first sign-in). Retry up to 5 times.
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase!
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (data) {
          if (mounted) setProfile(data as Profile);
          setLoading(false);
          return;
        }
        if (error && error.code !== "PGRST116") {
          console.error("Profile fetch error:", error);
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      // Profile still not found — create one manually as fallback
      const fallback = {
        id: session.user.id,
        username: (session.user.email ?? "user").split("@")[0],
        name: session.user.user_metadata?.full_name ?? session.user.email ?? "User",
        email: session.user.email ?? "",
        avatar_url: session.user.user_metadata?.avatar_url ?? null,
        bio: "",
        website: null,
        location: null,
        reputation: 0,
        role: "user" as const,
        banned: false,
        joined_date: new Date().toISOString(),
      };
      const { error: insertErr } = await supabase!.from("users").insert(fallback);
      if (!insertErr && mounted) setProfile(fallback);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [session]);

  const signInWithGoogle = React.useCallback(async () => {
    if (!supabase) return;
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, []);

  const signOut = React.useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!session?.user?.id || !supabase) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }, [session]);

  const updateProfile = React.useCallback(
    async (data: Partial<Profile>) => {
      if (!session?.user?.id || !supabase) return;
      const { error } = await supabase
        .from("users")
        .update(data)
        .eq("id", session.user.id);
      if (!error) {
        setProfile((p) => (p ? { ...p, ...data } : p));
      } else {
        console.error("Profile update error:", error);
      }
    },
    [session]
  );

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

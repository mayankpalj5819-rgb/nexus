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
          flowType: "pkce",
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
  loading: boolean;          // true while session/profile being determined
  profileLoading: boolean;   // true specifically while profile is being fetched
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
  const [profileLoading, setProfileLoading] = React.useState(false);

  // ── Step 1: Get initial session + subscribe to auth changes ──
  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      // Don't set loading=false here if there's a session — the profile-fetch
      // effect will handle that. Only set false if there's no session.
      if (!data.session) {
        setLoading(false);
      }
    });

    // Subscribe to auth state changes (sign in, sign out, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ── Step 2: Fetch profile whenever session changes ──
  React.useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setProfileLoading(true);

    (async () => {
      // Retry loop — the handle_new_user trigger sometimes hasn't fired yet
      // on the very first sign-in. Try up to 10 times with 300ms delay.
      for (let i = 0; i < 10; i++) {
        if (!mounted) return;
        const { data, error } = await supabase!
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (data) {
          if (mounted) {
            setProfile(data as Profile);
            setLoading(false);
            setProfileLoading(false);
          }
          return;
        }

        // Log unexpected errors (PGRST116 = no rows found, which is expected)
        if (error && error.code !== "PGRST116") {
          console.error("[auth] Profile fetch error:", error);
        }

        // Wait before retrying
        await new Promise((r) => setTimeout(r, 300));
      }

      // ── Fallback: profile not found after 10 retries — create manually ──
      if (!mounted) return;
      console.warn("[auth] Profile not found after retries, creating manually...");
      const user = session!.user;
      const fallback = {
        id: userId,
        username: (user.email ?? "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, ""),
        name: (user.user_metadata?.full_name as string) ?? (user.email ?? "User"),
        email: user.email ?? "",
        avatar_url: (user.user_metadata?.avatar_url as string) ?? (user.user_metadata?.picture as string) ?? null,
        bio: "",
        website: null,
        location: null,
        reputation: 0,
        role: "user" as const,
        banned: false,
        joined_date: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase!.from("users").insert(fallback);
      if (insertErr) {
        // Insert failed — maybe the row already exists (race condition with trigger)
        // Try one more fetch
        const { data: retryData } = await supabase!.from("users").select("*").eq("id", userId).maybeSingle();
        if (retryData && mounted) {
          setProfile(retryData as Profile);
        } else if (mounted) {
          // Last resort: use the fallback object locally so the user can at least use the app
          console.error("[auth] Profile insert failed and retry fetch failed:", insertErr);
          setProfile(fallback as Profile);
        }
      } else if (mounted) {
        setProfile(fallback as Profile);
      }

      if (mounted) {
        setLoading(false);
        setProfileLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session]);

  // ── OAuth sign-in ──
  const signInWithGoogle = React.useCallback(async () => {
    if (!supabase) return;
    // Redirect to origin (not /auth/callback) — the app is a SPA at /
    // detectSessionInUrl will pick up the session from the URL hash on return
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, []);

  // ── Sign out ──
  const signOut = React.useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setLoading(false);
  }, []);

  // ── Refresh profile from DB ──
  const refreshProfile = React.useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !supabase) return;
    setProfileLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
    setProfileLoading(false);
  }, [session]);

  // ── Update profile ──
  const updateProfile = React.useCallback(
    async (data: Partial<Profile>) => {
      const userId = session?.user?.id;
      if (!userId || !supabase) return;
      const { error } = await supabase
        .from("users")
        .update(data)
        .eq("id", userId);
      if (!error) {
        setProfile((p) => (p ? { ...p, ...data } : p));
      } else {
        console.error("[auth] Profile update error:", error);
      }
    },
    [session]
  );

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
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

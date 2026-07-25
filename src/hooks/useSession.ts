import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

export interface AawashProfile {
  id: string;
  display_code: string;
  full_name: string;
  mobile_number: string;
  login_id: string;
  email: string | null;
  avatar_url: string | null;
  team_id: string | null;
  wallet_balance: number;
  total_earnings: number;
  total_sales: number;
  referral_count: number;
  is_active: boolean;
}

export interface SessionState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: AawashProfile | null;
  role: AppRole | null;
}

/**
 * Central session hook. Registers `onAuthStateChange` first, then fetches
 * the current session (per Supabase best practice). Loads the user's
 * profile + role after auth transitions.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    session: null,
    profile: null,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | undefined;

    async function refreshProfile(userId: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || !profile) return;
      setState((prev) => ({ ...prev, profile: profile as AawashProfile }));
    }

    /** Live-follow the signed-in user's own profile row so admin-side
     *  wallet / status edits appear on their dashboard immediately. */
    function watchProfile(userId: string) {
      if (profileChannel) return;
      profileChannel = supabase
        .channel(`self-profile-${userId}`)
        .on(
          "postgres_changes" as never,
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` } as never,
          () => void refreshProfile(userId),
        )
        .subscribe();
      pollTimer = window.setInterval(() => void refreshProfile(userId), 20_000);
      window.addEventListener("focus", () => void refreshProfile(userId));
    }


    async function loadProfileAndRole(userId: string) {
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .order("role", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        profile: (profile as AawashProfile | null) ?? null,
        role: (roleRow?.role as AppRole | null) ?? null,
      }));
      watchProfile(userId);
    }

    // Register listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (event === "SIGNED_OUT" || !session?.user) {
        setState({
          loading: false,
          user: null,
          session: null,
          profile: null,
          role: null,
        });
        return;
      }
      // Defer to avoid deadlock with Supabase internals
      setTimeout(() => {
        void loadProfileAndRole(session.user.id);
      }, 0);
    });

    // Then fetch existing session
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        session: data.session,
        user: data.session?.user ?? null,
      }));
      if (data.session?.user) {
        void loadProfileAndRole(data.session.user.id);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

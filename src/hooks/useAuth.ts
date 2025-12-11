import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session?.user,
        });
      }
    );

    // THEN check for existing session and sign in anonymously if needed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthState({
          user: session.user,
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // No session - sign in anonymously
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) {
            console.error("Anonymous sign-in failed:", error);
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
          // Auth state change listener will handle the rest
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
};

// Get the current user's ID (auth.uid())
export const getAuthUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

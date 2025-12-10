import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton to prevent multiple signInAnonymously calls
let isSigningIn = false;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
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
        
        // Reset signing in flag when we get a session
        if (session) {
          isSigningIn = false;
        }
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
      } else if (!isSigningIn) {
        // No session and not already signing in - sign in anonymously
        isSigningIn = true;
        supabase.auth.signInAnonymously().then(({ error }) => {
          if (error) {
            console.error("Anonymous sign-in failed:", error);
            setAuthState(prev => ({ ...prev, isLoading: false }));
            isSigningIn = false;
          }
          // Auth state change listener will handle the rest
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

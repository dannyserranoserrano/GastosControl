import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isConfigured } from "./supabase";
import {
  localDataSummary,
  isMigratedFor,
  markMigratedFor,
  importLocalToCloud,
} from "./migrate";

const AuthCtx = createContext({
  user: null,
  loading: true,
  isConfigured: false,
  pendingMigration: null,
  migrating: false,
  signIn: async () => {},
  signOut: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  runMigration: async () => {},
  dismissMigration: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingMigration, setPendingMigration] = useState(null);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user || !isConfigured) {
      setPendingMigration(null);
      return;
    }
    (async () => {
      try {
        if (await isMigratedFor(user.id)) return;
        const summary = await localDataSummary();
        if (!cancelled && summary.count > 0) {
          setPendingMigration(summary);
        }
      } catch {
        // ignorar; la migración es opcional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(async (provider) => {
    if (!supabase) throw new Error("Supabase no configurado");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase no configurado");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase no configurado");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }, []);

  const runMigration = useCallback(async () => {
    if (!user) return;
    setMigrating(true);
    try {
      await importLocalToCloud(user.id);
      await markMigratedFor(user.id);
    } finally {
      setMigrating(false);
    }
    window.location.reload();
  }, [user]);

  const dismissMigration = useCallback(async () => {
    if (!user) return;
    await markMigratedFor(user.id);
    setPendingMigration(null);
  }, [user]);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        isConfigured,
        pendingMigration,
        migrating,
        signIn,
        signOut,
        signInWithPassword,
        signUpWithPassword,
        runMigration,
        dismissMigration,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
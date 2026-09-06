import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, Outlet } from '../lib/supabase';

interface AuthState {
  loading: boolean;
  profile: Profile | null;
  outlets: Outlet[];            // seluruh outlet yang boleh diakses profile ini
  activeOutletId: string | null;
  setActiveOutletId: (id: string) => void;
  signIn: (email: string, password: string) => Promise<string | null>; // return error message | null
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);

  async function loadProfile() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setProfile(null); setOutlets([]); setLoading(false); return; }

    const { data: prof, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single();

    if (error || !prof) { setProfile(null); setOutlets([]); setLoading(false); return; }
    setProfile(prof as Profile);

    // Admin => semua outlet. Selain itu => sesuai outlet_ids di profile.
    let outletQuery = supabase.from('outlets').select('*').order('name');
    if (prof.role !== 'admin') {
      outletQuery = outletQuery.in('id', prof.outlet_ids ?? []);
    }
    const { data: outletData } = await outletQuery;
    const list = (outletData ?? []) as Outlet[];
    setOutlets(list);
    setActiveOutletId((prev) => prev ?? list[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadProfile());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setOutlets([]);
    setActiveOutletId(null);
  }

  return (
    <AuthContext.Provider
      value={{ loading, profile, outlets, activeOutletId, setActiveOutletId, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isApproved: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch role and profile in parallel
        const [{ data: roleData }, { data: profile }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('profiles').select('is_approved').eq('user_id', session.user.id).maybeSingle(),
        ]);
        setIsAdmin(roleData?.role === 'admin');
        setIsApproved(profile?.is_approved ?? false);
      } else {
        setIsAdmin(false);
        setIsApproved(false);
      }
      setLoading(false);
    });

    // Then check current session — set loading false immediately if no session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isApproved, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

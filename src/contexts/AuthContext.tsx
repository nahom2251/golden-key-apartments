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
    const fetchUserExtras = async (userId: string) => {
      try {
        const [{ data: roleData }, { data: profile }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
          supabase.from('profiles').select('is_approved').eq('user_id', userId).maybeSingle(),
        ]);

        setIsAdmin(roleData?.role === 'admin');
        setIsApproved(profile?.is_approved ?? false);
      } catch (err) {
        console.error("Error fetching user extras:", err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // ✅ IMPORTANT: stop blocking UI immediately
      setLoading(false);

      if (session?.user) {
        // 🔥 Fetch in background (non-blocking)
        fetchUserExtras(session.user.id);
      } else {
        setIsAdmin(false);
        setIsApproved(false);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserExtras(session.user.id);
      }
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
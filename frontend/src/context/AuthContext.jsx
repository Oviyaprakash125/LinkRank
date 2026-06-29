import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRecruiter(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRecruiter(session.user.id);
      } else {
        setRecruiter(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRecruiter(userId) {
    const { data } = await supabase
      .from('recruiters')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setRecruiter(data);
    }
    setLoading(false);
  }

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email, password, fullName) => {
     const { error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } }
     });
     if (error) throw error;
  }

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
     return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading auth...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      token: session?.access_token, 
      user: session?.user, 
      recruiter, 
      tier: recruiter?.tier || null, 
      login, 
      signup,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

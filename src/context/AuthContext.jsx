import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Completely bypassed auth for the project! 
  // You are always logged in as a "tier_3" user so everything is unlocked.
  return (
    <AuthContext.Provider value={{ 
      token: 'dummy-token', 
      user: { id: 'dummy-user' }, 
      recruiter: { name: 'Project Admin', tier: 'tier_3' }, 
      tier: 'tier_3', 
      login: async () => {}, 
      signup: async () => {},
      logout: async () => {
         window.location.href = '/';
      } 
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

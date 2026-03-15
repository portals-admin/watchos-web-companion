import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth as authApi, getTokens, saveTokens, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = getTokens();
    if (!tokens?.accessToken) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => { clearTokens(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  async function signInWithApple(identityToken, authorizationCode, appleUser) {
    const data = await authApi.appleSignIn({ identityToken, authorizationCode, user: appleUser });
    saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  }

  async function signOut() {
    const tokens = getTokens();
    try { await authApi.signOut(tokens?.refreshToken); } catch { /* best-effort */ }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

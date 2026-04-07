// Auth context — JWT token storage + Google SSO user state
import React, { createContext, useCallback, useContext, useState } from 'react';

export const AuthContext = createContext(null);

/** Decode the payload from a JWT without verifying the signature (client-side only). */
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('sovereign_token');
    return t ? decodeToken(t) : null;
  });

  const login = useCallback((token) => {
    localStorage.setItem('sovereign_token', token);
    setUser(decodeToken(token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sovereign_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

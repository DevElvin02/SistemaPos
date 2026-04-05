import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, UserRole } from '../types/auth';
import {
  authenticateUser,
  FORCE_LOGOUT_KEY,
  getRolePermissions,
  initializeAuthStore,
  requestPasswordResetForEmail,
  resetPasswordWithToken,
} from '../lib/auth-store';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SESSION_KEY = 'auth_user';

function normalizeRole(role: string): UserRole {
  return role === 'user' ? 'cajero' : (role as UserRole);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    initializeAuthStore();

    const savedUser = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        const normalizedUser = {
          ...parsed,
          role: normalizeRole(parsed.role),
          ultimoLogin: parsed.ultimoLogin ? new Date(parsed.ultimoLogin) : undefined,
        };
        setUser(normalizedUser);
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(normalizedUser));
      } catch {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      }
    }

    // Migra/limpia sesiones antiguas persistidas para forzar login al reinicio.
    localStorage.removeItem(AUTH_SESSION_KEY);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FORCE_LOGOUT_KEY) {
        setUser(null);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const loggedUser = await authenticateUser(email, password);
      if (!loggedUser) {
        throw new Error('Email o contraseña incorrectos');
      }

      setUser(loggedUser);
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(loggedUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    const permissions = getRolePermissions(user.role as UserRole);
    return permissions.includes(action);
  };

  const requestPasswordReset = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return await requestPasswordResetForEmail(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await resetPasswordWithToken(token, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        hasPermission,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

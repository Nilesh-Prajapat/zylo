'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAccessToken } from './api/axios-client';
import { socketClient } from './socket';
import { UserProfile } from './types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; username: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const refreshRes = await apiClient.post('/auth/refresh');
      const token = refreshRes.data.data.accessToken;
      setAccessToken(token);

      const meRes = await apiClient.get('/auth/me');
      const currentUser = meRes.data.data.user;
      setUser(currentUser);
      socketClient.connect();
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      socketClient.disconnect();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { accessToken, user: loggedUser } = res.data.data;
    setAccessToken(accessToken);
    setUser(loggedUser);
    socketClient.connect();
    router.push('/');
  };

  const register = async (data: { email: string; password: string; username: string; displayName?: string }) => {
    const res = await apiClient.post('/auth/register', {
      email: data.email,
      password: data.password,
      username: data.username,
      displayName: data.displayName || data.username,
    });
    const { accessToken, user: newUser } = res.data.data;
    setAccessToken(accessToken);
    setUser(newUser);
    socketClient.connect();
    router.push('/');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      socketClient.disconnect();
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

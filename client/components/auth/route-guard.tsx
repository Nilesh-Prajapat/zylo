'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const AUTH_ROUTES = ['/login', '/register'];
const ADMIN_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/', '/explore', '/stream', '/profile'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
    const isPublicRoute = PUBLIC_ROUTES.some((route) => route === '/' ? pathname === '/' : pathname.startsWith(route));

    // Redirect authenticated users away from /login & /register
    if (isAuthenticated && isAuthRoute) {
      router.replace('/');
      return;
    }

    // Redirect unauthenticated users to /login for non-public routes
    if (!isAuthenticated && !isAuthRoute && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Protect Admin routes
    if (isAuthenticated && isAdminRoute && user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
  }, [isAuthenticated, loading, pathname, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Zylo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

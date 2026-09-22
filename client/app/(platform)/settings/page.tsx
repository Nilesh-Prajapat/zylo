'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SettingsRedirectPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      router.replace(`/profile/${user.id}`);
    } else {
      router.replace('/profile');
    }
  }, [router, user]);

  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center text-xs font-semibold text-zylo-muted">
        Redirecting to Profile & Preferences...
      </div>
    </div>
  );
}


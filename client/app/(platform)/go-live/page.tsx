'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GoLiveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/studio?golive=true');
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center bg-zylo-warm gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      <p className="text-xs font-bold text-zylo-secondary">Redirecting to Creator Studio...</p>
    </div>
  );
}

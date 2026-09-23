'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StudioLiveRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = (params?.streamId as string) || '';

  useEffect(() => {
    if (streamId) {
      router.replace(`/stream/${streamId}/studio`);
    } else {
      router.replace('/studio');
    }
  }, [streamId, router]);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center bg-zylo-warm gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      <p className="text-xs font-bold text-zylo-secondary">Opening Stream Studio...</p>
    </div>
  );
}

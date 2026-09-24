'use client';

import { CreatorGuard } from '@/components/shared/CreatorGuard';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <CreatorGuard>{children}</CreatorGuard>;
}

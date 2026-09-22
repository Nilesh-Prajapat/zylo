'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home as HomeIcon, Video, Radio, Gem } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isCreator = user?.role === 'CREATOR';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zylo-border bg-white/95 px-2 py-2.5 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      {/* Home */}
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 px-3 py-1 ${
          pathname === '/' ? 'text-zylo-purple' : 'text-zylo-secondary'
        }`}
      >
        <HomeIcon className="h-5 w-5" strokeWidth={pathname === '/' ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Home</span>
      </Link>

      {/* Explore */}
      <Link
        href="/explore"
        className={`flex flex-col items-center gap-1 px-3 py-1 ${
          pathname.startsWith('/explore') ? 'text-zylo-purple' : 'text-zylo-secondary'
        }`}
      >
        <Compass className="h-5 w-5" strokeWidth={pathname.startsWith('/explore') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Explore</span>
      </Link>

      {/* Go Live center button — Only for CREATOR */}
      {isCreator && (
        <Link
          href="/studio?golive=true"
          className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-zylo-purple text-white shadow-lg"
          style={{ boxShadow: '0 6px 16px rgba(124,58,237,0.3)' }}
        >
          <Radio className="h-5 w-5" />
        </Link>
      )}

      {/* Studio link — Only for CREATOR */}
      {isCreator && (
        <Link
          href="/studio"
          className={`flex flex-col items-center gap-1 px-3 py-1 ${
            pathname.startsWith('/studio') ? 'text-zylo-purple' : 'text-zylo-secondary'
          }`}
        >
          <Video className="h-5 w-5" strokeWidth={pathname.startsWith('/studio') ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Studio</span>
        </Link>
      )}

      {/* Wallet */}
      <Link
        href="/wallet"
        className={`flex flex-col items-center gap-1 px-3 py-1 ${
          pathname.startsWith('/wallet') ? 'text-zylo-purple' : 'text-zylo-secondary'
        }`}
      >
        <Gem className="h-5 w-5" strokeWidth={pathname.startsWith('/wallet') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">Wallet</span>
      </Link>
    </nav>
  );
}


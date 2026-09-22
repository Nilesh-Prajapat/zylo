'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home as HomeIcon, Video, Radio, Gem } from 'lucide-react';

const items = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Studio', href: '/studio', icon: Video },
  { label: 'Wallet', href: '/wallet', icon: Gem },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zylo-border bg-white/95 px-2 py-2.5 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      {items.slice(0, 2).map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              isActive ? 'text-zylo-purple' : 'text-zylo-secondary'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
      <Link
        href="/studio?golive=true"
        className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-zylo-purple text-white shadow-lg"
        style={{ boxShadow: '0 6px 16px rgba(124,58,237,0.3)' }}
      >
        <Radio className="h-5 w-5" />
      </Link>
      {items.slice(2).map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              isActive ? 'text-zylo-purple' : 'text-zylo-secondary'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

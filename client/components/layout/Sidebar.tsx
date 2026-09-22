'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Compass,
  Gem,
  Home as HomeIcon,
  Settings,
  UserRound,
  Users,
  Video,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import { Avatar } from '../shared/Avatar';
import { ActiveStreamBanner } from './ActiveStreamBanner';

import { useState } from 'react';
import { RoleSwitchModal } from '../shared/RoleSwitchModal';
import { Sparkles } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);

  const isCreator = user?.role === 'CREATOR';

  const navItems = [
    { label: 'Home', href: '/', icon: HomeIcon },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Following', href: '/following', icon: Users },
    ...(isCreator ? [{ label: 'Studio', href: '/studio', icon: Video }] : []),
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Wallet', href: '/wallet', icon: Gem },
    { label: 'Profile', href: user ? `/profile/${user.id}` : '/login', icon: UserRound },
  ];

  return (
    <>
      <aside className="hidden w-[244px] shrink-0 h-screen overflow-hidden flex-col border-r border-zylo-border bg-white px-4 py-6 lg:flex z-30 select-none">
        <div className="flex items-center justify-center px-3 pb-6">
          <Logo className="h-10 w-auto" />
        </div>

        <ActiveStreamBanner />

        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-zylo-soft text-zylo-purple'
                    : 'text-zylo-secondary hover:bg-zylo-warm hover:text-zylo-purple'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 px-1">
          {isCreator ? (
            <Link
              href="/studio?golive=true"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B8FF3D] px-4 py-3 text-xs font-black text-black shadow-sm transition-all hover:bg-[#a6fa26] hover:-translate-y-0.5 active:translate-y-0"
            >
              <Video className="h-4 w-4 text-black fill-black" /> Go Live
            </Link>
          ) : (
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B8FF3D] px-4 py-3 text-xs font-black text-black shadow-sm transition-all hover:bg-[#a6fa26] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-black fill-black" /> Become a Creator
            </button>
          )}
        </div>

      <div className="mt-auto pt-6 border-t border-zylo-border/60">
        {user ? (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-zylo-warm"
          >
            <div className="relative shrink-0">
              <Avatar src={user.avatarUrl} size="h-9 w-9" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-zylo-lime" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-zylo-text">
                {user.displayName || user.username}
              </p>
              <p className="truncate text-[10px] text-zylo-muted">@{user.username}</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center rounded-xl border border-zylo-border bg-zylo-warm py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>

    <RoleSwitchModal
      isOpen={showRoleModal}
      onClose={() => setShowRoleModal(false)}
      targetRole="CREATOR"
    />
  </>
  );
}


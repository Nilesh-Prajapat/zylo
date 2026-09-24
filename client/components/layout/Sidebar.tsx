'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Compass,
  Gem,
  Home as HomeIcon,
  UserRound,
  Users,
  Video,
  Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import { Avatar } from '../shared/Avatar';
import { ActiveStreamBanner } from './ActiveStreamBanner';
import { useState } from 'react';
import { RoleSwitchModal } from '../shared/RoleSwitchModal';

const DEMO_CREATOR = {
  id: 'creator_004',
  displayName: 'Maya Chen',
  username: 'mayachen',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);

  const activeUser = user || DEMO_CREATOR;
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
      <aside className="hidden w-[240px] shrink-0 h-screen overflow-hidden flex-col border-r border-[#E9E5F2] bg-white px-4 py-5 lg:flex z-30 select-none">
        <div className="flex items-center justify-start px-2 pb-4 pt-1">
          <Logo className="h-10 w-auto" />
        </div>

        <ActiveStreamBanner />

        <nav className="flex flex-col gap-1 mt-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'text-[#6F687D] hover:bg-[#F3EEFF] hover:text-[#7C3AED]'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Primary Action Button: Go Live for CREATOR, Become a Creator for NORMAL_USER */}
        <div className="mt-5 px-1">
          {isCreator ? (
            <Link
              href="/studio?golive=true"
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#B8FF3D] hover:bg-[#a5f025] text-black px-4 py-3 text-xs font-black shadow-xs transition-all transform active:scale-98"
            >
              <Video className="h-4 w-4 text-black fill-black" /> Go Live
            </Link>
          ) : (
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  setShowRoleModal(true);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#B8FF3D] hover:bg-[#a5f025] text-black px-4 py-3 text-xs font-black shadow-xs transition-all transform active:scale-98 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-black fill-black" /> Become a Creator
            </button>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[#E9E5F2]">
          <Link
            href={user ? `/profile/${user.id}` : '/login'}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#F3EEFF]"
          >
            <div className="relative shrink-0">
              <Avatar src={activeUser.avatarUrl} size="h-9 w-9" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#EF4444]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-extrabold text-[#171322]">
                  {activeUser.displayName}
                </p>
                {user?.role === 'CREATOR' && (
                  <span className="rounded bg-[#B8FF3D] px-1 py-0.2 text-[9px] font-black text-black">
                    PRO
                  </span>
                )}
              </div>
              <p className="truncate text-[10px] text-[#6F687D]">@{activeUser.username}</p>
            </div>
          </Link>
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

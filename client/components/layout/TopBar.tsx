'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '../shared/Avatar';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '@/lib/hooks/use-notifications';

export function TopBar() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const avatarUrl = user?.avatarUrl;

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#E9E5F2] bg-white px-5 sm:px-8 relative z-40">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-[480px]">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F687D]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators, categories or vibes..."
          className="h-[42px] w-full rounded-[14px] bg-[#FAFAFC] pl-10 pr-16 text-xs font-medium text-[#171322] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#7C3AED]/20 border border-[#E9E5F2]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#E9E5F2] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6F687D] hidden sm:block select-none">
          Ctrl K
        </span>
      </form>

      <div className="flex items-center gap-3 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`relative rounded-xl p-2.5 text-[#6F687D] transition-colors hover:bg-[#F3EEFF] hover:text-[#7C3AED] flex items-center justify-center cursor-pointer ${
              isNotifOpen ? 'bg-[#F3EEFF] text-[#7C3AED]' : ''
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-black text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        <Link
          href={user ? `/profile/${user.id}` : '/login'}
          className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:ring-2 hover:ring-[#7C3AED]/30"
        >
          <Avatar src={avatarUrl} size="h-9 w-9" />
        </Link>
      </div>
    </header>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '../shared/Avatar';

import { notificationsApi } from '@/lib/api';
import { socketClient } from '@/lib/socket';
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

  return (
    <header className="flex items-center gap-3 border-b border-zylo-border bg-white/80 px-5 py-3.5 backdrop-blur sm:px-8 relative z-40">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zylo-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators, categories or vibes..."
          className="h-10 w-full rounded-xl bg-zylo-warm pl-10 pr-16 text-sm text-zylo-text outline-none transition focus:ring-2 focus:ring-zylo-purple/20 border border-zylo-border/50"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-zylo-border bg-white px-2 py-0.5 text-[10px] font-semibold text-zylo-muted hidden sm:block">
          Ctrl K
        </span>
      </form>
      <div className="ml-auto flex items-center gap-2 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`relative rounded-xl p-2 text-zylo-secondary transition-colors hover:bg-zylo-warm flex items-center justify-center cursor-pointer ${
              isNotifOpen ? 'bg-zylo-soft text-zylo-purple' : ''
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zylo-purple px-1 text-[9px] font-black text-white shadow-xs animate-in zoom-in-75">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown Panel */}
          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        {user ? (
          <Link href={`/profile/${user.id}`} className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-zylo-warm">
            <Avatar src={user.avatarUrl} size="h-8 w-8" />
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-xl bg-zylo-purple px-4 py-2 text-xs font-bold text-white hover:bg-[#6926d1] transition"
          >
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}


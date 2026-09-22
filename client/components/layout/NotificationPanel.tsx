'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CreditCard,
  Gem,
  Radio,
  Tag,
  UserPlus,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { Notification, NotificationType } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/use-notifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications(false, 10);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    onClose();
    if (notif.entityType === 'STREAM' && notif.entityId) {
      router.push(`/stream/${notif.entityId}`);
    } else if (notif.entityType === 'USER' && notif.entityId) {
      router.push(`/profile/${notif.entityId}`);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'GIFT_RECEIVED':
        return <Gem className="h-4 w-4 text-zylo-purple" />;
      case 'FOLLOW':
        return <UserPlus className="h-4 w-4 text-zylo-purple" />;
      case 'STREAM_LIVE':
        return <Radio className="h-4 w-4 text-emerald-600" />;
      case 'TOP_UP_SUCCESS':
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case 'REDEMPTION_SUCCESS':
        return <Tag className="h-4 w-4 text-zylo-purple" />;
      default:
        return <Bell className="h-4 w-4 text-zylo-purple" />;
    }
  };

  const unreadExist = notifications.some((n) => !n.read);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-zylo-border bg-white shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 select-none"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zylo-border bg-zylo-warm/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zylo-purple" />
          <h3 className="text-xs font-extrabold text-zylo-text">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          {unreadExist && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 rounded-lg bg-white border border-zylo-border px-2 py-1 text-[10px] font-bold text-zylo-purple hover:bg-zylo-soft transition shadow-2xs"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zylo-muted hover:bg-zylo-warm transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications Scroll List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-zylo-border">
        {isLoading ? (
          <div className="divide-y divide-zylo-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-[#ECE8F5] shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-3/4 rounded bg-[#ECE8F5]" />
                  <div className="h-2.5 w-full rounded bg-[#ECE8F5]" />
                  <div className="h-2 w-1/3 rounded bg-[#ECE8F5]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex items-start gap-3 p-3.5 transition cursor-pointer ${
                !item.read ? 'bg-zylo-soft/30 hover:bg-zylo-soft/50' : 'hover:bg-zylo-warm/60'
              }`}
            >
              <div className="rounded-xl bg-zylo-warm p-2 shrink-0 border border-zylo-border/60 mt-0.5">
                {getIcon(item.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-extrabold text-zylo-text truncate">{item.title}</h4>
                  {!item.read && <span className="h-2 w-2 rounded-full bg-zylo-purple shrink-0" />}
                </div>
                <p className="text-[11px] font-semibold text-zylo-secondary line-clamp-2 mt-0.5 leading-snug">
                  {item.message}
                </p>
                <p className="mt-1 text-[9px] font-bold text-zylo-muted">
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-zylo-muted">
            <Bell className="mx-auto h-6 w-6 mb-1.5 text-zylo-border" />
            <p className="text-xs font-extrabold text-zylo-text">You're all caught up!</p>
            <p className="text-[10px] font-medium text-zylo-muted mt-0.5">No notifications right now.</p>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="border-t border-zylo-border bg-zylo-warm/40 p-2.5 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zylo-purple hover:text-[#6926d1] transition"
        >
          <span>View all notifications</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

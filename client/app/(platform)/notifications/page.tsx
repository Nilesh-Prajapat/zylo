'use client';

import { useState } from 'react';
import { Bell, UserPlus, Gem, Radio, Check, CreditCard, Tag, Loader2 } from 'lucide-react';
import { NotificationType } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/use-notifications';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications(
    filter === 'UNREAD'
  );

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

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 select-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">
            Notifications
          </h1>
          <p className="mt-1 text-sm font-medium text-zylo-secondary">
            Stay updated with gift alerts, followers, and broadcast activity.
          </p>
        </div>

        <button
          onClick={() => markAllAsRead()}
          className="flex items-center gap-1.5 w-fit rounded-xl border border-zylo-border bg-white px-4 py-2 text-xs font-extrabold text-zylo-text hover:bg-zylo-warm transition shadow-xs cursor-pointer"
        >
          <Check className="h-3.5 w-3.5 text-zylo-purple" /> Mark all as read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zylo-border pb-3">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'UNREAD', label: 'Unread' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              filter === key
                ? 'bg-zylo-purple text-white shadow-xs'
                : 'bg-white border border-zylo-border text-zylo-secondary hover:bg-zylo-warm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="divide-y divide-zylo-border rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 p-4 animate-pulse">
              <div className="h-9 w-9 rounded-xl bg-[#ECE8F5] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-48 rounded bg-[#ECE8F5]" />
                <div className="h-2.5 w-full max-w-sm rounded bg-[#ECE8F5]" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="divide-y divide-zylo-border rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.read && markAsRead(item.id)}
              className={`flex items-center justify-between p-4 transition cursor-pointer ${
                !item.read ? 'bg-zylo-soft/40' : 'hover:bg-zylo-warm/40'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="rounded-xl bg-zylo-warm p-2.5 shrink-0 border border-zylo-border/60">
                  {getIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-zylo-text truncate">{item.title}</h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-zylo-purple shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zylo-secondary truncate">{item.message}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-zylo-muted">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {!item.read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(item.id);
                  }}
                  className="rounded-lg bg-white border border-zylo-border px-2.5 py-1 text-[11px] font-bold text-zylo-purple hover:bg-zylo-soft transition shrink-0 ml-3"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-zylo-border bg-white p-12 text-center text-zylo-muted shadow-xs">
          <Bell className="mx-auto h-8 w-8 mb-2 text-zylo-border" />
          <p className="text-xs font-extrabold text-zylo-text">You're all caught up!</p>
          <p className="text-[11px] font-semibold text-zylo-muted mt-0.5">No new notifications to display right now.</p>
        </div>
      )}
    </div>
  );
}

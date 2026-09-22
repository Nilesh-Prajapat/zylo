'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Radio, AlertTriangle, Home } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

const adminNav = [
  { label: 'Overview', href: '/admin', icon: Home },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Streams', href: '/admin/streams', icon: Radio },
  { label: 'Reports', href: '/admin/reports', icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <Logo className="h-6 w-auto" />
            <span className="rounded bg-zylo-purple px-2 py-0.5 text-[10px] font-extrabold text-white">
              ADMIN
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {adminNav.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-zylo-purple text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
        >
          Exit Admin Console
        </Link>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

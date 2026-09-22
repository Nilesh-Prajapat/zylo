'use client';

import { useState, useEffect } from 'react';
import { Users, Radio, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { AdminUser, AdminStream, AdminReport } from '@/lib/types';

export default function AdminOverviewPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [streams, setStreams] = useState<AdminStream[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [uList, sList, rList] = await Promise.all([
          adminApi.getUsers(),
          adminApi.getStreams(),
          adminApi.getReports(),
        ]);
        setUsers(uList);
        setStreams(sList);
        setReports(rList);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load admin overview');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  const liveStreamsCount = streams.filter((s) => s.status === 'LIVE').length;
  const pendingReportsCount = reports.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWED').length;

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Admin Control Overview</h1>
      <p className="mt-1 text-xs text-slate-400">
        Monitor system metrics, active live broadcasts, user accounts, and moderation reports.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', count: users.length.toString(), icon: Users, color: 'text-emerald-400' },
          { label: 'Live Streams', count: liveStreamsCount.toString(), icon: Radio, color: 'text-zylo-lime' },
          { label: 'Pending Reports', count: pendingReportsCount.toString(), icon: AlertTriangle, color: 'text-rose-400' },
          { label: 'System Uptime', count: '99.98%', icon: Activity, color: 'text-zylo-purple' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">{count}</p>
          </div>
        ))}
      </div>

      {/* Pending Moderation Reports */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h3 className="text-sm font-extrabold text-white mb-4">Pending Moderation Reports</h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-400">No moderation reports found.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-bold text-white">
                    Report by{' '}
                    <span className="text-zylo-purple">
                      {report.reporter?.displayName || report.reporter?.username || 'User'}
                    </span>{' '}
                    against <span className="text-rose-400">{report.targetType} ({report.targetId})</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{report.reason}</p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

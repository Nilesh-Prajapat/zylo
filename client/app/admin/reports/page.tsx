'use client';

import React, { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminReports } from '@/lib/hooks/use-queries';
import { useQueryClient } from '@tanstack/react-query';
import { AdminTableRowSkeleton } from '@/components/shared/Skeletons';

export default function AdminReportsPage() {
  const { data: reports = [], isLoading: loading, error: queryError } = useAdminReports();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const error = queryError ? 'Failed to fetch reports' : '';

  const handleResolve = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      setResolvingId(id);
      await adminApi.resolveReport(id, status);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update report status');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Moderation Reports</h1>
      <p className="mt-1 text-xs text-slate-400">
        Review user reports, resolve violations, and maintain community guidelines.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase">
            <tr>
              <th className="p-4">Reporter</th>
              <th className="p-4">Target</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <>
                <tr><td colSpan={5}><AdminTableRowSkeleton /></td></tr>
                <tr><td colSpan={5}><AdminTableRowSkeleton /></td></tr>
                <tr><td colSpan={5}><AdminTableRowSkeleton /></td></tr>
              </>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-slate-400">No moderation reports found.</td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4 font-bold text-slate-300">
                    {r.reporter?.displayName || r.reporter?.username || 'User'}
                  </td>
                  <td className="p-4 font-extrabold text-white">
                    {r.targetType} ({r.targetId})
                  </td>
                  <td className="p-4 text-slate-400">{r.reason}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && (
                      <>
                        <button
                          disabled={resolvingId === r.id}
                          onClick={() => handleResolve(r.id, 'RESOLVED')}
                          className="rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2.5 py-1 text-xs font-bold hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={resolvingId === r.id}
                          onClick={() => handleResolve(r.id, 'DISMISSED')}
                          className="rounded-lg bg-slate-800 text-slate-300 px-2.5 py-1 text-xs font-bold hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { AdminStream } from '@/lib/types';

export default function AdminStreamsPage() {
  const [streamsList, setStreamsList] = useState<AdminStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [endingId, setEndingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      try {
        setLoading(true);
        setError('');
        const data = await adminApi.getStreams();
        setStreamsList(data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to fetch streams');
      } finally {
        setLoading(false);
      }
    }
    loadStreams();
  }, []);

  const handleEndStream = async (id: string) => {
    try {
      setEndingId(id);
      await adminApi.endStream(id);
      setStreamsList((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to terminate stream');
    } finally {
      setEndingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Active Streams Monitor</h1>
      <p className="mt-1 text-xs text-slate-400">
        Monitor real-time broadcasts, view current viewer counts, and terminate broadcasts violating safety rules.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        {streamsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active streams found.</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase">
              <tr>
                <th className="p-4">Broadcaster</th>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {streamsList.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4 font-extrabold text-white">
                    {s.broadcaster?.displayName || s.broadcaster?.username || 'Unknown'}
                  </td>
                  <td className="p-4 text-slate-300 font-medium">{s.title}</td>
                  <td className="p-4 font-bold text-emerald-400">{s.status}</td>
                  <td className="p-4 text-right">
                    {s.status === 'LIVE' && (
                      <button
                        disabled={endingId === s.id}
                        onClick={() => handleEndStream(s.id)}
                        className="rounded-lg bg-rose-600/20 text-rose-400 border border-rose-600/30 px-3 py-1 text-xs font-bold hover:bg-rose-600 hover:text-white transition disabled:opacity-50"
                      >
                        {endingId === s.id ? 'Terminating...' : 'Terminate Stream'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

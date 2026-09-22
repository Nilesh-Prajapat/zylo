'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { AdminUser } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError('');
        const data = await adminApi.getUsers();
        setUsers(data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const toggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      setUpdatingId(user.id);
      await adminApi.updateUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user status');
    } finally {
      setUpdatingId(null);
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
      <h1 className="text-2xl font-black text-white">User Management</h1>
      <p className="mt-1 text-xs text-slate-400">
        Search, review permissions, and suspend or restore user accounts.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No users found.</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4">
                    <p className="font-extrabold text-white">{u.displayName || u.username}</p>
                    <p className="text-[10px] text-slate-400">@{u.username} · {u.email}</p>
                  </td>
                  <td className="p-4 uppercase font-bold text-slate-400">{u.role}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      disabled={updatingId === u.id}
                      onClick={() => toggleStatus(u)}
                      className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
                    >
                      {updatingId === u.id ? 'Updating...' : u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
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

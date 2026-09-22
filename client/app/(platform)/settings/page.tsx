'use client';

import { useState, useEffect } from 'react';
import { User, Shield, Bell, Lock, Save, Check, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usersApi, mediaApi } from '@/lib/api';
import axios from 'axios';

export default function SettingsPage() {
  const { user, logout, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy'>('profile');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  useEffect(() => {
    if (user) {
      setName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.profile?.bio || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const uploadRes = await mediaApi.uploadFile(file, 'AVATAR');
      const newUrl = uploadRes.url;
      setAvatarUrl(newUrl);

      // Save to user profile
      await usersApi.updateProfile({ avatarUrl: newUrl });
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await usersApi.updateProfile({ displayName: name, bio });
      await refreshSession();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">Settings</h1>
        <p className="mt-1 text-sm text-zylo-secondary">
          Manage your profile details, account options, and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-1.5 rounded-3xl border border-zylo-border bg-white p-3 shadow-xs h-fit">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'account', label: 'Account', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'privacy', label: 'Privacy & Safety', icon: Lock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition text-left ${
                activeTab === id
                  ? 'bg-zylo-soft text-zylo-purple'
                  : 'text-zylo-secondary hover:bg-zylo-warm hover:text-zylo-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Form Content Area */}
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-extrabold text-zylo-text">Public Profile</h3>

              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop'}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border border-zylo-border"
                />
                <label className="flex items-center gap-2 rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft cursor-pointer transition">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin text-zylo-purple" /> : <Upload className="h-4 w-4" />}
                  <span>Change Avatar</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-zylo-text">Display Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-zylo-border bg-zylo-warm px-4 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zylo-text">Username</label>
                <input
                  value={username}
                  disabled
                  className="mt-1.5 h-11 w-full rounded-xl border border-zylo-border bg-gray-100 px-4 text-xs text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zylo-text">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
                />
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-extrabold text-zylo-text">Account Information</h3>
              <div>
                <label className="text-xs font-bold text-zylo-text">Email Address</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="mt-1.5 h-11 w-full rounded-xl border border-zylo-border bg-gray-100 px-4 text-xs text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zylo-text">Role</label>
                <input
                  value={user?.role || 'NORMAL_USER'}
                  disabled
                  className="mt-1.5 h-11 w-full rounded-xl border border-zylo-border bg-gray-100 px-4 text-xs text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="pt-4 border-t border-zylo-border">
                <button
                  onClick={logout}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  Log Out of Session
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-zylo-text">Notification Preferences</h3>
              {['Live stream alerts from followed creators', 'Gift notifications and weekly summaries'].map((label, idx) => (
                <label key={idx} className="flex items-center gap-3 text-xs font-semibold text-zylo-text cursor-pointer">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-zylo-purple accent-zylo-purple" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold text-zylo-text">Privacy & Safety</h3>
              {['Make my profile visible on public search engines', 'Allow public gift activity feed'].map((label, idx) => (
                <label key={idx} className="flex items-center gap-3 text-xs font-semibold text-zylo-text cursor-pointer">
                  <input type="checkbox" defaultChecked={idx === 1} className="h-4 w-4 rounded text-zylo-purple accent-zylo-purple" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-zylo-border flex items-center justify-between">
            {saved ? (
              <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600">
                <Check className="h-4 w-4" /> Changes saved successfully!
              </span>
            ) : <span />}

            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

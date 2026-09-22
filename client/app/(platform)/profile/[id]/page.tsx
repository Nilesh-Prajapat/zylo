'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Share2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Upload,
  User,
  Shield,
  Bell,
  Lock,
  Check,
  LogOut,
} from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { UserProfile, Stream } from '@/lib/types';
import { usersApi, streamsApi, mediaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFollowUser } from '@/hooks/use-follow';

function formatNumber(count?: number): string {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser, logout, refreshSession } = useAuth();
  const profileId = (params?.id as string) || currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Streams' | 'About'>('Streams');

  // Edit Profile & Preferences Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState<'profile' | 'account' | 'notifications' | 'privacy'>('profile');
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const followMutation = useFollowUser();

  const isSelf = currentUser && (profileId === currentUser.id || profileId === 'me');

  useEffect(() => {
    async function loadProfile() {
      if (!profileId) return;
      setLoading(true);
      setError(null);
      try {
        if (isSelf) {
          const me = await usersApi.getMe();
          setProfile(me);
          setIsFollowing(false);
          setEditName(me.displayName || me.username || '');
          setEditBio(me.profile?.bio || '');
          setEditAvatarUrl(me.avatarUrl || '');
          setEditCoverImageUrl(me.profile?.coverImageUrl || '');
        } else {
          const res = await usersApi.getUserById(profileId);
          setProfile(res.user);
          setIsFollowing(!!res.isFollowing);
        }

        // Load creator streams
        const userStreams = await streamsApi.getLiveStreams();
        setStreams(userStreams.filter((s) => s.broadcasterId === profileId));
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [profileId, isSelf]);

  const handleFollowToggle = () => {
    if (!profile || isSelf) return;
    followMutation.mutate({
      targetUserId: profile.id,
      isCurrentlyFollowing: isFollowing,
    });
    setIsFollowing(!isFollowing);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            _count: {
              ...prev._count,
              followers: Math.max(0, (prev._count?.followers || 0) + (isFollowing ? -1 : 1)),
            },
          }
        : null
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setEditError(null);
    try {
      const uploadRes = await mediaApi.uploadFile(file, 'AVATAR');
      setEditAvatarUrl(uploadRes.url);
      await usersApi.updateProfile({ avatarUrl: uploadRes.url });
      await refreshSession();
    } catch (err: any) {
      setEditError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setEditError(null);
    try {
      const uploadRes = await mediaApi.uploadFile(file, 'COVER_IMAGE');
      setEditCoverImageUrl(uploadRes.url);
      await usersApi.updateProfile({ coverImageUrl: uploadRes.url });
      await refreshSession();
    } catch (err: any) {
      setEditError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const updatedUser = await usersApi.updateProfile({
        displayName: editName,
        bio: editBio,
        avatarUrl: editAvatarUrl || undefined,
        coverImageUrl: editCoverImageUrl || undefined,
      });
      setProfile(updatedUser);
      await refreshSession();
      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setIsEditModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile settings');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-sm font-bold text-red-700">{error || 'Profile not found'}</h3>
      </div>
    );
  }

  const name = profile.displayName || profile.username;
  const avatar = profile.avatarUrl;
  const coverImage = profile.profile?.coverImageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop';
  const bio = profile.profile?.bio || 'Passionate creator live on Zylo.';
  const followerCount = profile._count?.followers || 0;
  const followingCount = profile._count?.following || 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8">
      {/* Profile Cover Banner */}
      <div className="relative h-[200px] sm:h-[260px] w-full overflow-hidden rounded-3xl bg-zylo-soft border border-zylo-border">
        <img src={coverImage} alt={name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Profile Info Header */}
      <div className="relative z-10 -mt-14 px-4 sm:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Avatar src={avatar} size="h-24 w-24 sm:h-28 sm:w-28" className="ring-4 ring-white shadow-xl" />
          <div className="mb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-zylo-text sm:text-3xl">{name}</h1>
              {profile.role === 'CREATOR' && <CheckCircle2 className="h-5 w-5 text-zylo-purple fill-current" />}
            </div>
            <p className="text-sm font-semibold text-zylo-muted">@{profile.username}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isSelf ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-zylo-border bg-white px-4 py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-warm transition shadow-xs"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Profile & Preferences</span>
            </button>
          ) : (
            <button
              onClick={handleFollowToggle}
              disabled={followMutation.isPending}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-xs transition disabled:opacity-50 ${
                isFollowing
                  ? 'border border-zylo-border bg-white text-zylo-text hover:bg-zylo-warm'
                  : 'bg-zylo-purple text-white hover:bg-[#6926d1]'
              }`}
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
          <button className="rounded-xl border border-zylo-border bg-white p-2.5 text-zylo-secondary hover:bg-zylo-warm transition shadow-xs">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bio & Social Stats */}
      <div className="mt-6 px-4 sm:px-8">
        <p className="max-w-xl text-sm leading-relaxed text-zylo-secondary">{bio}</p>

        <div className="mt-5 flex items-center gap-6 border-y border-zylo-border py-4">
          <Link href={`/profile/${profile.id}/followers`} className="group flex items-center gap-1.5 hover:opacity-80 transition">
            <span className="text-base font-extrabold text-zylo-text group-hover:text-zylo-purple">{formatNumber(followerCount)}</span>
            <span className="text-xs text-zylo-muted group-hover:text-zylo-purple">Followers</span>
          </Link>
          <Link href={`/profile/${profile.id}/following`} className="group flex items-center gap-1.5 hover:opacity-80 transition">
            <span className="text-base font-extrabold text-zylo-text group-hover:text-zylo-purple">{formatNumber(followingCount)}</span>
            <span className="text-xs text-zylo-muted group-hover:text-zylo-purple">Following</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 px-4 sm:px-8">
        <div className="flex border-b border-zylo-border">
          {(['Streams', 'About'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-xs font-bold transition border-b-2 ${
                activeTab === tab
                  ? 'border-zylo-purple text-zylo-purple'
                  : 'border-transparent text-zylo-muted hover:text-zylo-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'Streams' && (
            <div>
              {streams.length === 0 ? (
                <div className="rounded-2xl border border-zylo-border bg-white p-8 text-center text-xs text-zylo-secondary">
                  No active streams from this creator right now.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {streams.map((s) => (
                    <Link
                      key={s.id}
                      href={`/stream/${s.id}`}
                      className="group relative overflow-hidden rounded-2xl bg-zylo-text border border-zylo-border"
                    >
                      <div className="relative aspect-video">
                        <img
                          src={s.thumbnailUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop'}
                          alt={s.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105 opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="truncate text-xs font-bold text-white">{s.title}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'About' && (
            <div className="max-w-xl rounded-2xl border border-zylo-border bg-white p-6">
              <h3 className="text-sm font-extrabold text-zylo-text">About {name}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zylo-secondary">{bio}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-zylo-muted">
                <Calendar className="h-4 w-4" /> Account Type: <span className="font-bold text-zylo-purple">{profile.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile & Preferences Drawer/Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zylo-border pb-4">
              <h2 className="text-lg font-extrabold text-zylo-text">Edit Profile & Preferences</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1.5 text-zylo-muted hover:bg-zylo-warm hover:text-zylo-text transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="mt-4 flex gap-2 border-b border-zylo-border pb-3">
              {[
                { id: 'profile', label: 'Public Profile', icon: User },
                { id: 'account', label: 'Account & Security', icon: Shield },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Privacy & Safety', icon: Lock },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setEditTab(id as any)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    editTab === id
                      ? 'bg-zylo-purple text-white shadow-xs'
                      : 'text-zylo-secondary hover:bg-zylo-warm hover:text-zylo-text'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Error / Success alert */}
            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                <Check className="h-4 w-4" /> Profile updated successfully!
              </div>
            )}

            {/* Tab Body */}
            <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
              {editTab === 'profile' && (
                <div className="flex flex-col gap-4">
                  {/* Avatar upload */}
                  <div>
                    <label className="text-xs font-bold text-zylo-text">Avatar</label>
                    <div className="mt-2 flex items-center gap-4">
                      <Avatar src={editAvatarUrl} size="h-16 w-16" />
                      <label className="flex items-center gap-2 rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft cursor-pointer transition">
                        {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin text-zylo-purple" /> : <Upload className="h-4 w-4" />}
                        <span>Change Avatar</span>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Cover upload */}
                  <div>
                    <label className="text-xs font-bold text-zylo-text">Cover Banner</label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="h-16 w-32 overflow-hidden rounded-xl border border-zylo-border bg-zylo-soft">
                        <img src={editCoverImageUrl || coverImage} alt="Cover Preview" className="h-full w-full object-cover" />
                      </div>
                      <label className="flex items-center gap-2 rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft cursor-pointer transition">
                        {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin text-zylo-purple" /> : <Upload className="h-4 w-4" />}
                        <span>Change Banner</span>
                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zylo-text">Display Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3.5 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zylo-text">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
                    />
                  </div>
                </div>
              )}

              {editTab === 'account' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-zylo-text">Email Address</label>
                    <input
                      value={profile.email || currentUser?.email || ''}
                      disabled
                      className="mt-1.5 h-10 w-full rounded-xl border border-zylo-border bg-gray-100 px-3.5 text-xs text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zylo-text">Account Role</label>
                    <div className="mt-1.5 flex items-center justify-between rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2.5">
                      <span className="text-xs font-extrabold text-zylo-purple">Account Type: {profile.role}</span>
                      <span className="rounded-md bg-zylo-soft px-2 py-0.5 text-[10px] font-bold text-zylo-purple">Read Only</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zylo-border">
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out of Session</span>
                    </button>
                  </div>
                </div>
              )}

              {editTab === 'notifications' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-extrabold text-zylo-text">Notification Alerts</h4>
                  {['Live stream alerts from followed creators', 'Gift activity and weekly summaries', 'New follower notifications'].map((label, idx) => (
                    <label key={idx} className="flex items-center gap-3 text-xs font-semibold text-zylo-text cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-zylo-purple accent-zylo-purple" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {editTab === 'privacy' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-extrabold text-zylo-text">Privacy Settings</h4>
                  {['Make profile visible on search engines', 'Allow public gift leaderboard inclusion'].map((label, idx) => (
                    <label key={idx} className="flex items-center gap-3 text-xs font-semibold text-zylo-text cursor-pointer">
                      <input type="checkbox" defaultChecked={idx === 1} className="h-4 w-4 rounded text-zylo-purple accent-zylo-purple" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-zylo-border pt-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-zylo-border bg-white px-4 py-2 text-xs font-bold text-zylo-secondary hover:bg-zylo-warm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingEdit}
                className="flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-2 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-xs disabled:opacity-50"
              >
                {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

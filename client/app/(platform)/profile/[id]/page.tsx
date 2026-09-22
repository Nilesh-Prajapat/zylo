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
} from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { UserProfile, Stream } from '@/lib/types';
import { usersApi, followsApi, streamsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function formatNumber(count?: number): string {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const profileId = (params?.id as string) || currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Streams' | 'About'>('Streams');

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

  const handleFollowToggle = async () => {
    if (!profile || isSelf || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followsApi.unfollow(profile.id);
        setIsFollowing(false);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                _count: {
                  ...prev._count,
                  followers: Math.max(0, (prev._count?.followers || 1) - 1),
                },
              }
            : null
        );
      } else {
        await followsApi.follow(profile.id);
        setIsFollowing(true);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                _count: {
                  ...prev._count,
                  followers: (prev._count?.followers || 0) + 1,
                },
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || 'Follow action failed');
    } finally {
      setFollowLoading(false);
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
            <Link
              href="/settings"
              className="rounded-xl border border-zylo-border bg-white px-4 py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-warm transition shadow-sm"
            >
              Edit Profile
            </Link>
          ) : (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-sm transition disabled:opacity-50 ${
                isFollowing
                  ? 'border border-zylo-border bg-white text-zylo-text hover:bg-zylo-warm'
                  : 'bg-zylo-purple text-white hover:bg-[#6926d1]'
              }`}
            >
              {followLoading ? 'Updating...' : isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
          <button className="rounded-xl border border-zylo-border bg-white p-2.5 text-zylo-secondary hover:bg-zylo-warm transition shadow-sm">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bio & Social Stats */}
      <div className="mt-6 px-4 sm:px-8">
        <p className="max-w-xl text-sm leading-relaxed text-zylo-secondary">{bio}</p>

        <div className="mt-5 flex items-center gap-6 border-y border-zylo-border py-4">
          <div>
            <span className="text-base font-extrabold text-zylo-text">{formatNumber(followerCount)}</span>
            <span className="ml-1 text-xs text-zylo-muted">Followers</span>
          </div>
          <div>
            <span className="text-base font-extrabold text-zylo-text">{formatNumber(followingCount)}</span>
            <span className="ml-1 text-xs text-zylo-muted">Following</span>
          </div>
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
                <Calendar className="h-4 w-4" /> Role: {profile.role}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

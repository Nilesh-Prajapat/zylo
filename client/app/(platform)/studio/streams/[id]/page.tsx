'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  streamsApi,
  streamAnalyticsApi,
  moderationApi,
} from '@/lib/api';
import { Stream, ChatMessage } from '@/lib/types';
import {
  Video,
  BarChart3,
  MessageSquare,
  Trophy,
  Settings,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  Gem,
  Users,
  Shield,
  Play,
  Globe,
  Lock,
} from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';

export default function SingleStreamStudioPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;

  const [stream, setStream] = useState<Stream | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'replay' | 'chat' | 'supporters' | 'analytics' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [updatingPub, setUpdatingPub] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('PUBLIC');

  useEffect(() => {
    async function loadStreamData() {
      try {
        setLoading(true);
        const [sData, aData, cData] = await Promise.all([
          streamsApi.getStreamById(streamId),
          streamAnalyticsApi.getAnalytics(streamId).catch(() => null),
          streamsApi.getStreamChat(streamId, 100).catch(() => []),
        ]);
        setStream(sData.stream);
        setAnalytics(aData);
        setChatLogs(cData);
        setEditTitle(sData.stream.title);
        setEditDesc(sData.stream.description || '');
        setEditVisibility(sData.stream.visibility || 'PUBLIC');
      } finally {
        setLoading(false);
      }
    }
    if (streamId) loadStreamData();
  }, [streamId]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="mx-auto max-w-[1140px] px-6 py-12 text-center">
        <h2 className="text-2xl font-extrabold text-zylo-text">Stream Not Found</h2>
        <Link href="/studio/streams" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-zylo-purple">
          <ArrowLeft className="h-4 w-4" /> Back to Stream Library
        </Link>
      </div>
    );
  }

  const handleTogglePublication = async (newStatus: 'PUBLISHED' | 'HIDDEN') => {
    try {
      setUpdatingPub(true);
      const updated = await streamsApi.updateStreamPublication(stream.id, newStatus);
      setStream(updated.stream);
    } catch (err) {
      alert('Failed to update publication status');
    } finally {
      setUpdatingPub(false);
    }
  };

  const handleDeleteReplay = async () => {
    if (!confirm('Are you sure you want to delete this stream recording? This action removes the video from Cloudflare R2 and cannot be undone.')) return;

    try {
      setDeleting(true);
      await streamsApi.deleteStream(stream.id);
      router.push('/studio/streams');
    } catch (err) {
      alert('Failed to delete replay');
      setDeleting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await streamsApi.updateStream(stream.id, {
        title: editTitle,
        description: editDesc,
        visibility: editVisibility as any,
      });
      setStream(updated.stream);
      alert('Stream metadata saved');
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 lg:py-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/studio/streams"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-zylo-muted hover:text-zylo-purple transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Streams
          </Link>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-zylo-text sm:text-3xl">
            {stream.title}
          </h1>
          <p className="mt-1 text-xs text-zylo-muted flex items-center gap-2">
            <span>Status: <strong>{stream.status}</strong></span>
            <span>•</span>
            <span>Recording: <strong>{stream.recordingStatus}</strong></span>
            <span>•</span>
            <span>Created: {new Date(stream.createdAt).toLocaleDateString()}</span>
          </p>
        </div>

        {/* Publication Control */}
        <div className="flex items-center gap-3">
          {stream.recordingStatus === 'READY' && (
            <button
              onClick={() => handleTogglePublication(stream.publicationStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')}
              disabled={updatingPub}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                stream.publicationStatus === 'PUBLISHED'
                  ? 'bg-zylo-warm border border-zylo-border text-zylo-text hover:bg-zylo-soft'
                  : 'bg-zylo-purple text-white shadow-xs hover:bg-zylo-purple-hover'
              }`}
            >
              {updatingPub ? 'Updating...' : stream.publicationStatus === 'PUBLISHED' ? 'Hide Replay' : 'Publish Replay'}
            </button>
          )}

          {stream.status === 'ENDED' && (
            <button
              onClick={handleDeleteReplay}
              disabled={deleting}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-extrabold text-red-600 hover:bg-red-100 transition"
            >
              <Trash2 className="h-4 w-4 inline mr-1" />
              {deleting ? 'Deleting...' : 'Delete Stream'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-zylo-border overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: Video },
          { id: 'replay', label: 'Replay / Video', icon: Play },
          { id: 'chat', label: 'Chat Audit', icon: MessageSquare },
          { id: 'supporters', label: 'Supporters', icon: Trophy },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-zylo-purple text-zylo-purple'
                  : 'border-transparent text-zylo-muted hover:text-zylo-text'
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
              <h3 className="text-base font-extrabold text-zylo-text mb-4">Stream Summary</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Duration</span>
                  <p className="mt-1 text-lg font-black text-zylo-text">
                    {stream.duration ? `${Math.floor(stream.duration / 60)}m ${Math.floor(stream.duration % 60)}s` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Peak Viewers</span>
                  <p className="mt-1 text-lg font-black text-zylo-purple">{stream.peakViewerCount}</p>
                </div>
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Live Views</span>
                  <p className="mt-1 text-lg font-black text-zylo-text">{stream.viewerCount}</p>
                </div>
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Replay Views</span>
                  <p className="mt-1 text-lg font-black text-zylo-text">{stream.replayViews}</p>
                </div>
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Followers Gained</span>
                  <p className="mt-1 text-lg font-black text-emerald-600">+{analytics?.followersGained || 0}</p>
                </div>
                <div className="rounded-2xl bg-zylo-warm/40 p-4 border border-zylo-border/60">
                  <span className="text-[11px] font-bold text-zylo-muted">Gift Points</span>
                  <p className="mt-1 text-lg font-black text-zylo-purple">✦ {analytics?.totalGiftPoints || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
              <h3 className="text-base font-extrabold text-zylo-text mb-2">Description</h3>
              <p className="text-xs text-zylo-secondary whitespace-pre-wrap">
                {stream.description || 'No description provided for this broadcast.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
              <h3 className="text-sm font-extrabold text-zylo-text mb-3">Recording & Storage</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zylo-border/40">
                  <span className="text-zylo-muted">Recording Status:</span>
                  <span className="font-bold text-zylo-text">{stream.recordingStatus}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zylo-border/40">
                  <span className="text-zylo-muted">Publication:</span>
                  <span className="font-bold text-zylo-text">{stream.publicationStatus}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zylo-border/40">
                  <span className="text-zylo-muted">Visibility:</span>
                  <span className="font-bold text-zylo-text">{stream.visibility}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zylo-muted">Storage Key:</span>
                  <span className="font-mono text-[10px] text-zylo-text truncate max-w-[150px]">
                    {stream.recordingStorageKey || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPLAY PLAYER */}
      {activeTab === 'replay' && (
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
          <h3 className="text-lg font-extrabold text-zylo-text mb-4">Broadcast Replay Player</h3>

          {stream.recordingStatus === 'READY' && stream.replayUrl ? (
            <div className="max-w-4xl mx-auto">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                <video src={stream.replayUrl} controls className="h-full w-full object-contain" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zylo-muted">Playback Source URL:</p>
                  <p className="text-xs font-mono text-zylo-purple truncate max-w-xl">{stream.replayUrl}</p>
                </div>
                <Link
                  href={`/stream/${stream.id}`}
                  className="rounded-xl bg-zylo-lime px-4 py-2 text-xs font-black text-black hover:brightness-95 transition"
                >
                  View Public Replay Page
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-semibold text-zylo-muted">
              {stream.recordingStatus === 'PROCESSING'
                ? 'Recording is currently processing. Replay will become available automatically once complete.'
                : 'No recording available for this stream.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHAT AUDIT */}
      {activeTab === 'chat' && (
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
          <h3 className="text-lg font-extrabold text-zylo-text mb-4">Historical Chat Log Audit</h3>
          {chatLogs.length === 0 ? (
            <p className="text-xs text-zylo-muted py-8 text-center">No chat messages logged during this stream.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {chatLogs.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 rounded-xl border border-zylo-border/60 bg-zylo-warm/20 p-3">
                  <Avatar src={msg.user?.avatarUrl} size="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-zylo-text">
                        {msg.user?.displayName || msg.user?.username}
                      </span>
                      <span className="text-[10px] text-zylo-muted font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-zylo-text mt-0.5">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SUPPORTERS */}
      {activeTab === 'supporters' && (
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="text-lg font-extrabold text-zylo-text mb-4">Top Stream Supporters</h3>
          {analytics?.topSupporters?.length === 0 ? (
            <p className="text-xs text-zylo-muted py-8 text-center">No gifts received during this broadcast.</p>
          ) : (
            <div className="space-y-2">
              {analytics?.topSupporters?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-zylo-border/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-zylo-purple">0{idx + 1}</span>
                    <Avatar src={item.user?.avatarUrl} size="h-8 w-8" />
                    <span className="text-xs font-extrabold text-zylo-text">
                      {item.user?.displayName || item.user?.username}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-zylo-purple flex items-center gap-1">
                    <Gem className="h-3.5 w-3.5" /> ✦ {item.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DETAILED ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs">
          <h3 className="text-lg font-extrabold text-zylo-text mb-6">Exhaustive Broadcast Metrics</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/30 p-4">
              <span className="text-xs font-extrabold text-zylo-muted">Peak Viewers</span>
              <p className="mt-1 text-2xl font-black text-zylo-purple">{analytics?.peakConcurrentViewers || 0}</p>
            </div>
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/30 p-4">
              <span className="text-xs font-extrabold text-zylo-muted">Avg Viewers</span>
              <p className="mt-1 text-2xl font-black text-zylo-text">{analytics?.averageConcurrentViewers || 0}</p>
            </div>
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/30 p-4">
              <span className="text-xs font-extrabold text-zylo-muted">Unique Chatters</span>
              <p className="mt-1 text-2xl font-black text-zylo-text">{analytics?.uniqueChatters || 0}</p>
            </div>
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/30 p-4">
              <span className="text-xs font-extrabold text-zylo-muted">Total Gifts</span>
              <p className="mt-1 text-2xl font-black text-zylo-purple">{analytics?.totalGifts || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs max-w-xl">
          <h3 className="text-lg font-extrabold text-zylo-text mb-4">Edit Metadata</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zylo-text mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-xl border border-zylo-border p-3 text-xs font-bold focus:outline-none focus:border-zylo-purple"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zylo-text mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-zylo-border p-3 text-xs font-medium focus:outline-none focus:border-zylo-purple"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zylo-text mb-1">Visibility</label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
                className="w-full rounded-xl border border-zylo-border p-3 text-xs font-bold focus:outline-none focus:border-zylo-purple"
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-zylo-lime px-6 py-2.5 text-xs font-black text-black hover:brightness-95 transition"
            >
              Save Settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

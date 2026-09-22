'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Play,
  Volume2,
  VolumeX,
  Users,
  Send,
  Gem,
  Loader2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Stream, ChatMessage } from '@/lib/types';
import { streamsApi, followsApi, streamAnalyticsApi } from '@/lib/api';
import { parseApiError } from '@/lib/api/axios-client';
import { socketClient } from '@/lib/socket';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
import { useAuth } from '@/lib/auth';
import { GiftNotificationTile } from '@/components/gifts/GiftNotificationTile';
import { GiftModal } from '@/components/gifts/GiftModal';
import { ReplayChatRail } from '@/components/stream/ReplayChatRail';
import { SupporterLeaderboard } from '@/components/stream/SupporterLeaderboard';

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function CountdownDisplay({ scheduledAt }: { scheduledAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);

  if (!timeLeft) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <div className="flex flex-col items-center bg-black/60 border border-white/10 rounded-2xl px-3.5 py-1.5 min-w-[56px]">
        <span className="text-lg font-black text-amber-400">{pad(timeLeft.hours)}</span>
        <span className="text-[9px] font-bold text-zylo-muted uppercase tracking-wider">Hours</span>
      </div>
      <span className="text-lg font-black text-amber-400">:</span>
      <div className="flex flex-col items-center bg-black/60 border border-white/10 rounded-2xl px-3.5 py-1.5 min-w-[56px]">
        <span className="text-lg font-black text-amber-400">{pad(timeLeft.minutes)}</span>
        <span className="text-[9px] font-bold text-zylo-muted uppercase tracking-wider">Mins</span>
      </div>
      <span className="text-lg font-black text-amber-400">:</span>
      <div className="flex flex-col items-center bg-black/60 border border-white/10 rounded-2xl px-3.5 py-1.5 min-w-[56px]">
        <span className="text-lg font-black text-amber-400">{pad(timeLeft.seconds)}</span>
        <span className="text-[9px] font-bold text-zylo-muted uppercase tracking-wider">Secs</span>
      </div>
    </div>
  );
}

export default function StreamViewerPage() {
  const params = useParams();
  const { user } = useAuth();
  const streamId = (params?.id as string) || '';

  const [stream, setStream] = useState<Stream | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const [subscribedVideoTrack, setSubscribedVideoTrack] = useState<RemoteTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replayVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  // 1. Load Stream Info & Chat History
  useEffect(() => {
    async function loadStream() {
      try {
        setLoading(true);
        setError(null);
        const data = await streamsApi.getStreamById(streamId);
        setStream(data.stream);
        setIsFollowing(!!data.isFollowing);
        setViewerCount(data.stream.viewerCount || 0);

        if (data.stream.status === 'ENDED' && data.stream.recordingStatus === 'READY') {
          streamAnalyticsApi.recordReplayView(data.stream.id).catch(() => {});
        }

        const initialChat = await streamsApi.getStreamChat(data.stream.id, 50);
        setMessages(initialChat);
      } catch (err: any) {
        const parsed = parseApiError(err);
        setError(parsed.message || 'Failed to load stream');
      } finally {
        setLoading(false);
      }
    }

    if (streamId) loadStream();
  }, [streamId]);

  // 2. Connect LiveKit Room if Live
  useEffect(() => {
    if (!stream || stream.status !== 'LIVE') return;

    let room: Room;

    async function connectLiveKit() {
      try {
        const tokenRes = await streamsApi.getViewerToken(streamId);
        room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video) {
            setSubscribedVideoTrack(track);
            if (videoRef.current) {
              track.attach(videoRef.current);
            }
          } else if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            document.body.appendChild(el);
          }
        });

        await room.connect(tokenRes.livekitUrl, tokenRes.token);
      } catch (err) {
        console.error('Failed to connect LiveKit viewer room', err);
      }
    }

    connectLiveKit();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [stream?.id, stream?.status]);

  // 3. Socket.IO Realtime Listeners
  useEffect(() => {
    if (!streamId) return;

    socketClient.joinStream(streamId);

    const handleMessage = (newMsg: ChatMessage) => {
      setMessages((prev) => [...prev, newMsg]);
    };

    const handleChatDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleViewerCount = (data: { viewerCount: number }) => {
      setViewerCount(data.viewerCount);
    };

    const handleStatusChanged = (data: { status: any }) => {
      setStream((prev) => (prev ? { ...prev, status: data.status } : null));
    };

    socketClient.on('chat:message', handleMessage);
    socketClient.on('chat:deleted', handleChatDeleted);
    socketClient.on('stream:viewer_count', handleViewerCount);
    socketClient.on('stream:status_changed', handleStatusChanged);

    return () => {
      socketClient.leaveStream(streamId);
      socketClient.off('chat:message', handleMessage);
      socketClient.off('chat:deleted', handleChatDeleted);
      socketClient.off('stream:viewer_count', handleViewerCount);
      socketClient.off('stream:status_changed', handleStatusChanged);
    };
  }, [streamId]);

  const handleSendMessage = () => {
    if (!chatText.trim() || !user) return;
    socketClient.sendChatMessage(streamId, chatText.trim(), user.displayName || user.username, user.avatarUrl || '');
    setChatText('');
  };

  const handleFollowToggle = async () => {
    if (!stream) return;
    try {
      if (isFollowing) {
        await followsApi.unfollow(stream.broadcasterId);
        setIsFollowing(false);
      } else {
        await followsApi.follow(stream.broadcasterId);
        setIsFollowing(true);
      }
    } catch (err: any) {
      alert(err.message || 'Follow action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-zylo-warm">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-sm font-bold text-red-700">{error || 'Stream not found'}</h3>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-zylo-purple hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const broadcaster = stream.broadcaster;
  const broadcasterName = broadcaster?.displayName || broadcaster?.username || 'Broadcaster';
  const isLive = stream.status === 'LIVE';

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)] bg-zylo-warm text-zylo-text select-none">
      {/* Main Video & Details Viewport */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6">
        {/* Media Player Container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black border border-zylo-border shadow-xl">
          {/* Top-Right Realtime Gift Notification Overlay Tile */}
          <GiftNotificationTile streamId={stream.id} />

          {needsUserInteraction && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-xs">
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.play();
                  setNeedsUserInteraction(false);
                }}
                className="flex items-center gap-2 rounded-2xl bg-zylo-purple px-6 py-3 text-sm font-extrabold text-white shadow-xl hover:bg-zylo-purple-hover transition"
              >
                <Play className="h-5 w-5" /> Tap to Play Video
              </button>
            </div>
          )}

          {isLive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="h-full w-full object-cover"
            />
          ) : stream.status === 'SCHEDULED' ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#120e21] text-white p-6 text-center">
              {stream.thumbnailUrl && (
                <img src={stream.thumbnailUrl} alt={stream.title} className="absolute inset-0 h-full w-full object-cover opacity-30 blur-xs" />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 animate-pulse">
                  <Radio className="h-8 w-8" />
                </div>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/40 mb-2">
                  SCHEDULED BROADCAST
                </span>
                <h2 className="text-xl font-extrabold text-white max-w-md">{stream.title}</h2>
                <p className="mt-2 text-xs text-zylo-muted max-w-sm">
                  {stream.scheduledAt
                    ? `Scheduled to start at ${new Date(stream.scheduledAt).toLocaleString()}`
                    : 'The creator is preparing for this live stream. It will start shortly.'}
                </p>

                {stream.scheduledAt && <CountdownDisplay scheduledAt={stream.scheduledAt} />}
              </div>
            </div>
          ) : stream.replayUrl ? (
            <video
              ref={replayVideoRef}
              src={stream.replayUrl}
              controls
              poster={stream.thumbnailUrl || undefined}
              onTimeUpdate={() => {
                if (replayVideoRef.current) setVideoCurrentTime(replayVideoRef.current.currentTime);
              }}
              className="h-full w-full object-cover"
            />
          ) : stream.recordingStatus === 'PROCESSING' ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#120e21] text-white p-6 text-center">
              <Loader2 className="h-10 w-10 text-amber-400 animate-spin mb-3" />
              <p className="text-base font-extrabold">Recording Processing</p>
              <p className="text-xs text-zylo-muted mt-1">Replay will be available shortly after processing completes.</p>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#120e21] text-white">
              <Radio className="h-12 w-12 text-zylo-muted mb-2" />
              <p className="text-base font-extrabold">Stream has ended</p>
              <p className="text-xs text-zylo-muted mt-1">Thank you for watching!</p>
            </div>
          )}

          {/* Video Overlay Top Info Bar */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-zylo-lime px-2.5 py-1 text-xs font-black text-black shadow">
                <span className="h-2 w-2 rounded-full bg-black animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-black text-white">
                REPLAY
              </span>
            )}

            <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur border border-white/10">
              <Users className="h-3.5 w-3.5" /> {isLive ? formatViewers(viewerCount) : `${stream.replayViews || 0} views`}
            </span>
          </div>

          {/* Video Controls Bottom Bar for Live Mute */}
          {isLive && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between z-20">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 backdrop-blur transition"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>

        {/* Stream Details & Action Bar */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zylo-border pb-5">
          <div className="flex items-start gap-3.5">
            <Link href={`/profile/${broadcaster?.id}`}>
              <Avatar src={broadcaster?.avatarUrl} size="h-12 w-12" ring />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${broadcaster?.id}`}
                  className="text-base font-extrabold text-zylo-text hover:underline"
                >
                  {broadcasterName}
                </Link>
                {user?.id !== broadcaster?.id && (
                  <button
                    onClick={handleFollowToggle}
                    className={`ml-2 rounded-xl px-3 py-1 text-xs font-bold transition ${
                      isFollowing
                        ? 'bg-zylo-soft text-zylo-purple border border-zylo-purple/30'
                        : 'bg-zylo-purple text-white hover:bg-zylo-purple-hover'
                    }`}
                  >
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                )}
              </div>
              <h1 className="mt-1 text-lg font-bold text-zylo-text">{stream.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGiftModal(true)}
              className="flex items-center gap-2 rounded-xl bg-zylo-purple px-4 py-2.5 text-xs font-extrabold text-white hover:bg-zylo-purple-hover transition shadow-xs"
            >
              <Gem className="h-4 w-4 text-zylo-lime" /> Gift Creator
            </button>
          </div>
        </div>

        {/* Supporter Leaderboard Component */}
        <div className="mt-6 h-64">
          <SupporterLeaderboard streamId={stream.id} />
        </div>
      </div>

      {/* Right Column: Live Chat or Replay Chat Rail */}
      <div className="w-full lg:w-[350px] shrink-0 border-t lg:border-t-0 lg:border-l border-zylo-border bg-white flex flex-col h-[520px] lg:h-auto">
        {isLive || stream.status === 'SCHEDULED' ? (
          <>
            <div className="p-4 border-b border-zylo-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-zylo-lime animate-pulse' : 'bg-amber-400'}`} />
                <h3 className="text-sm font-extrabold text-zylo-text">
                  {isLive ? 'Live Chat' : 'Stream Chat'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-zylo-muted">
                {isLive ? `${formatViewers(viewerCount)} watching` : 'Waiting for broadcast'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-zylo-warm/40">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-zylo-muted">
                  {stream.status === 'SCHEDULED' ? 'Chat will open once creator starts live stream.' : 'No messages yet.'}
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="flex items-start gap-2.5 text-xs">
                    <Avatar src={msg.user?.avatarUrl} size="h-7 w-7" />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-zylo-text">{msg.user?.displayName || msg.user?.username || 'User'}</span>
                      <p className="mt-0.5 leading-relaxed text-zylo-secondary">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-zylo-border bg-white">
              <div className="flex items-center gap-2 rounded-2xl border border-zylo-border bg-zylo-warm p-1.5 pl-3">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!isLive}
                  placeholder={isLive ? 'Send a message...' : 'Chat disabled until stream goes live'}
                  className="min-w-0 flex-1 bg-transparent text-xs text-zylo-text outline-none placeholder:text-zylo-muted disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isLive}
                  className="rounded-xl bg-zylo-purple p-2.5 text-white transition hover:bg-zylo-purple-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <ReplayChatRail
            messages={messages}
            currentTime={videoCurrentTime}
            streamStartedAt={stream.startedAt}
          />
        )}
      </div>

      {/* Multi-Balance Gift Modal */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        streamId={stream.id}
        broadcasterName={broadcasterName}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio,
  Users,
  Clock,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  StopCircle,
  Send,
  Trash2,
  AlertCircle,
  Loader2,
  Edit3,
  Check,
  Calendar,
  ArrowLeft,
  Settings,
  Globe,
  EyeOff,
  Lock,
  Shield,
  MessageSquare,
  Gem,
} from 'lucide-react';
import { Stream, ChatMessage } from '@/lib/types';
import { streamsApi } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import { Room, createLocalTracks, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/shared/Avatar';
import { GiftNotificationTile } from '@/components/gifts/GiftNotificationTile';
import { ChatModerationMenu } from '@/components/stream/ChatModerationMenu';
import { CreatorGuard } from '@/components/shared/CreatorGuard';

export default function StreamStudioPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params?.id as string) || '';

  const [stream, setStream] = useState<Stream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcaster Media & Controls
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Modal State
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Edit Metadata State
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  // 1. Warn on navigation if stream is LIVE
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stream?.status === 'LIVE') {
        e.preventDefault();
        e.returnValue = 'You are currently live. Leaving Stream Studio will end your broadcast.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stream?.status]);

  // 2. Local Camera Preview Initialization (getUserMedia / LocalTracks)
  useEffect(() => {
    let isMounted = true;

    async function initPreview() {
      try {
        const tracks = await createLocalTracks({ video: true, audio: true });
        if (!isMounted) {
          tracks.forEach((t) => (t as any).stop?.());
          return;
        }

        const videoTrack = tracks.find((t) => t.kind === 'video') as LocalVideoTrack;
        const audioTrack = tracks.find((t) => t.kind === 'audio') as LocalAudioTrack;

        if (videoTrack) setLocalVideoTrack(videoTrack);
        if (audioTrack) setLocalAudioTrack(audioTrack);
      } catch (err) {
        console.warn('Camera preview failed:', err);
      }
    }

    initPreview();

    return () => {
      isMounted = false;
      if (localVideoTrack) localVideoTrack.stop();
      if (localAudioTrack) localAudioTrack.stop();
    };
  }, []);

  // Attach local video track to video element
  useEffect(() => {
    if (localVideoTrack && videoRef.current && isCameraOn && !loading) {
      localVideoTrack.attach(videoRef.current);
    }
  }, [localVideoTrack, loading, isCameraOn]);

  // 3. Load Stream Data
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadStream() {
      setLoading(true);
      setError(null);

      try {
        const data = await streamsApi.getStreamById(id);
        if (!isMounted) return;

        setStream(data.stream);
        setEditTitle(data.stream.title);
        setEditDesc(data.stream.description || '');
        setViewerCount(data.stream.viewerCount || 0);

        // Load chat history
        try {
          const history = await streamsApi.getChatHistory(data.stream.id);
          if (isMounted && history.length > 0) {
            setMessages(history);
          }
        } catch (err) {
          // Chat history load non-fatal
        }

        // If stream is already LIVE, connect publisher to LiveKit room
        if (data.stream.status === 'LIVE') {
          await connectLiveKitPublisher(data.stream.id);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.error?.message || err.message || 'Failed to load stream details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStream();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [id]);

  // Helper to connect LiveKit publisher room when stream is live
  const connectLiveKitPublisher = async (streamId: string) => {
    try {
      const tokenData = await streamsApi.getStreamToken(streamId);
      const room = new Room();
      roomRef.current = room;

      await room.connect(tokenData.livekitUrl, tokenData.token);

      if (localVideoTrack) {
        await room.localParticipant.publishTrack(localVideoTrack);
      }
      if (localAudioTrack) {
        await room.localParticipant.publishTrack(localAudioTrack);
      }
    } catch (err) {
      console.warn('LiveKit connection error:', err);
    }
  };

  // 4. Timer for Live Stream Duration
  useEffect(() => {
    if (stream?.status !== 'LIVE') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stream?.status]);

  const [activeModMenuMsgId, setActiveModMenuMsgId] = useState<string | null>(null);

  // 5. Socket.IO Realtime Connections
  useEffect(() => {
    if (!id) return;

    socketClient.joinStream(id);

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleChatDeleted = (data: { streamId: string; messageId: string }) => {
      if (data.streamId === id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    };

    const handleViewerCount = (data: { streamId: string; viewerCount: number }) => {
      if (data.streamId === id) {
        setViewerCount(data.viewerCount);
      }
    };

    const handleStatusChanged = (data: { streamId: string; status: any }) => {
      if (data.streamId === id && stream) {
        setStream((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    };

    const handleGiftEvent = (data: any) => {
      const giftMsgId = data.id || `gift-${Date.now()}-${Math.random()}`;
      setMessages((prev) => {
        if (prev.some((m) => m.id === giftMsgId)) return prev;
        const giftMessage: ChatMessage = {
          id: giftMsgId,
          streamId: id,
          userId: data.sender?.id || '',
          message: `🎁 ${data.senderName || data.sender?.displayName || 'Viewer'} sent ${data.giftName || 'Gift'} (${data.giftEmoji || '🎁'} x${data.quantity || 1})!`,
          createdAt: data.createdAt || new Date().toISOString(),
          user: {
            id: data.sender?.id || '',
            username: data.sender?.username || data.senderName || 'Viewer',
            displayName: data.sender?.displayName || data.senderName || 'Viewer',
            avatarUrl: data.sender?.avatarUrl || null,
          },
        };
        return [...prev, giftMessage];
      });
    };

    socketClient.on('chat:message', handleMessage);
    socketClient.on('chat:deleted', handleChatDeleted);
    socketClient.on('stream:viewer_count', handleViewerCount);
    socketClient.on('stream:status_changed', handleStatusChanged);
    socketClient.on('gift:sent', handleGiftEvent);

    return () => {
      socketClient.leaveStream(id);
      socketClient.off('chat:message', handleMessage);
      socketClient.off('chat:deleted', handleChatDeleted);
      socketClient.off('stream:viewer_count', handleViewerCount);
      socketClient.off('stream:status_changed', handleStatusChanged);
      socketClient.off('gift:sent', handleGiftEvent);
    };

  }, [id, stream]);

  // Media Controls Handlers
  const handleToggleCamera = async () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    if (localVideoTrack) {
      if (newState) {
        await localVideoTrack.unmute();
      } else {
        await localVideoTrack.mute();
      }
    }
    if (roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(newState);
    }
  };

  const handleToggleMic = async () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localAudioTrack) {
      if (newState) {
        await localAudioTrack.unmute();
      } else {
        await localAudioTrack.mute();
      }
    }
    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(newState);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!roomRef.current) return;
    try {
      const newState = !isScreenSharing;
      await roomRef.current.localParticipant.setScreenShareEnabled(newState);
      setIsScreenSharing(newState);
    } catch (err) {
      console.warn('Screen share error:', err);
    }
  };

  // Chat Handlers
  const handleSendMessage = () => {
    if (!chatText.trim() || !user) return;
    socketClient.sendChatMessage(id, chatText.trim(), user.displayName || user.username, user.avatarUrl || '');
    setChatText('');
  };

  const handleDeleteChatMessage = (messageId: string) => {
    socketClient.emit('chat:delete', { streamId: id, messageId });
  };

  // Edit Metadata Handler
  const handleSaveMetadata = async () => {
    if (!stream) return;
    try {
      const updated = await streamsApi.updateStream(stream.id, {
        title: editTitle,
        description: editDesc,
      });
      setStream(updated.stream);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update metadata');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Action Button: START LIVE
  // ─────────────────────────────────────────────────────────────
  const handleStartLive = async () => {
    if (!stream) return;
    setStartingLive(true);
    try {
      // 1. Call Backend to transition status -> LIVE
      const res = await streamsApi.startStream(stream.id);
      setStream(res.stream);

      // 2. Connect LiveKit publisher and start media broadcast
      await connectLiveKitPublisher(stream.id);
    } catch (err: any) {
      alert(err.message || 'Failed to start live stream');
    } finally {
      setStartingLive(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Action Button: END LIVE
  // ─────────────────────────────────────────────────────────────
  const handleEndStream = async () => {
    if (!stream || isEnding) return;
    setIsEnding(true);
    try {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      const res = await streamsApi.endStream(stream.id);
      setStream(res.stream);
      setShowEndConfirm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to end stream. Please try again.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleCancelStream = async () => {
    if (!stream || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await streamsApi.cancelStream(stream.id);
      setStream(res.stream);
      setShowCancelConfirm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel stream');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)] bg-zylo-warm animate-pulse">
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 gap-5">
          <div className="h-16 w-full rounded-3xl bg-[#ECE8F5]" />
          <div className="aspect-video w-full rounded-3xl bg-[#ECE8F5]" />
          <div className="h-32 w-full rounded-3xl bg-[#ECE8F5]" />
        </div>
        <div className="w-full lg:w-[360px] border-l border-zylo-border bg-white h-auto" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-sm font-bold text-red-700">{error || 'Stream studio not found'}</h3>
        <Link href="/studio" className="mt-4 inline-block text-xs font-bold text-zylo-purple hover:underline">
          Return to Studio Dashboard
        </Link>
      </div>
    );
  }

  const isBroadcaster = user?.id === stream.broadcasterId;

  return (
    <CreatorGuard>
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)] bg-zylo-warm text-zylo-text">
      {/* Main Stream Studio Control Center */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 gap-5">
        {/* Top Header / Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zylo-border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="flex items-center gap-1.5 rounded-xl border border-zylo-border bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Studio
            </Link>

            {stream.status === 'LIVE' ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-black tracking-wide text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE
              </span>
            ) : stream.status === 'SCHEDULED' ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black tracking-wide text-white shadow-xs">
                STUDIO PREVIEW
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-xl bg-zylo-muted px-3.5 py-1.5 text-xs font-black tracking-wide text-white shadow-xs">
                {stream.status}
              </span>
            )}

            {stream.status === 'LIVE' && (
              <span className="flex items-center gap-1.5 rounded-xl bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-secondary border border-zylo-border">
                <Clock className="h-3.5 w-3.5 text-zylo-purple" /> {formatTimer(elapsedSeconds)}
              </span>
            )}

            <span className="flex items-center gap-1.5 rounded-xl bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-secondary border border-zylo-border">
              <Users className="h-3.5 w-3.5 text-zylo-purple" /> {viewerCount} Viewers
            </span>
          </div>

          {/* Action Buttons: START LIVE / END LIVE */}
          <div className="flex items-center gap-2">
            {stream.status === 'SCHEDULED' && isBroadcaster && (
              <>
                <button
                  onClick={handleStartLive}
                  disabled={startingLive}
                  className="flex items-center gap-2 rounded-xl bg-[#B8FF3D] px-6 py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {startingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4 fill-black" />}
                  <span>START LIVE</span>
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-100 transition shadow-xs cursor-pointer"
                >
                  Cancel Stream
                </button>
              </>
            )}

            {stream.status === 'LIVE' && isBroadcaster && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={isEnding}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                <span>END LIVE</span>
              </button>
            )}
          </div>
        </div>

        {/* Scheduled Time Banner if Scheduled */}
        {stream.status === 'SCHEDULED' && stream.scheduledAt && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-extrabold text-amber-900 shadow-xs">
            <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Scheduled for: {new Date(stream.scheduledAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
            </span>
          </div>
        )}

        {/* Camera Preview Area */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black border border-zylo-border shadow-xl">
          {/* Top-Right Realtime Gift Notification Overlay Tile */}
          <GiftNotificationTile streamId={stream.id} />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${!isCameraOn && !isScreenSharing ? 'hidden' : ''}`}
          />

          {!isCameraOn && !isScreenSharing && (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#120e21] text-white">
              <VideoOff className="h-12 w-12 text-zylo-muted mb-2" />
              <p className="text-sm font-bold">Camera is turned off</p>
            </div>
          )}

          {/* Camera Preview Status Badge */}
          <div className="absolute top-4 left-4 backdrop-blur-md bg-black/60 px-3.5 py-1.5 rounded-xl border border-white/10 text-[11px] font-extrabold text-white">
            {stream.status === 'LIVE' ? '🔴 LIVE BROADCAST' : '📷 CAMERA PREVIEW (Offline)'}
          </div>

          {/* Broadcaster Media Floating Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 backdrop-blur-md bg-black/50 p-2 rounded-2xl border border-white/10">
            <button
              onClick={handleToggleCamera}
              className={`rounded-xl p-2.5 transition cursor-pointer ${
                isCameraOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'
              }`}
              title="Toggle Camera"
            >
              {isCameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={handleToggleMic}
              className={`rounded-xl p-2.5 transition cursor-pointer ${
                isMicOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'
              }`}
              title="Toggle Microphone"
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {stream.status === 'LIVE' && (
              <button
                onClick={handleToggleScreenShare}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                  isScreenSharing ? 'bg-[#B8FF3D] text-black' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title="Share Screen"
              >
                <Monitor className="h-4 w-4" />
                <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stream Information Card */}
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-extrabold text-zylo-text">Stream Details</h3>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <Check className="h-4 w-4" /> Updated!
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zylo-text block mb-1">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs font-medium outline-none focus:border-zylo-purple"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zylo-text block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:border-zylo-purple"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMetadata}
                  className="rounded-xl bg-zylo-purple px-4 py-2 text-xs font-bold text-white hover:bg-[#6926d1]"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-zylo-border px-4 py-2 text-xs font-bold text-zylo-secondary hover:bg-zylo-warm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-zylo-text">{stream.title}</h1>
                <p className="mt-1 text-xs text-zylo-secondary">{stream.description || 'No description provided.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zylo-muted">
                  <span className="rounded-lg bg-zylo-warm border border-zylo-border px-2.5 py-1 text-zylo-text">
                    Category: {stream.category?.name || 'General'}
                  </span>
                  <span className="rounded-lg bg-zylo-warm border border-zylo-border px-2.5 py-1 text-zylo-text">
                    Visibility: {stream.visibility}
                  </span>
                  <span className="rounded-lg bg-zylo-warm border border-zylo-border px-2.5 py-1 text-zylo-text">
                    Language: {stream.language || 'English'}
                  </span>
                </div>
              </div>
              {isBroadcaster && stream.status !== 'ENDED' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-zylo-border bg-zylo-warm px-3.5 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-zylo-purple" /> Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Chat Panel */}
      <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-zylo-border bg-white flex flex-col h-[520px] lg:h-auto">
        <div className="p-4 border-b border-zylo-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#ff426d]" />
            <h3 className="text-sm font-extrabold text-zylo-text">Stream Chat</h3>
          </div>
          <span className="text-xs font-semibold text-zylo-muted">{viewerCount} online</span>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zylo-warm/40">
          {stream.status === 'SCHEDULED' && messages.length === 0 && (
            <div className="p-4 text-center text-xs font-bold text-zylo-muted bg-white rounded-2xl border border-zylo-border">
              Chat will become active when you press START LIVE.
            </div>
          )}

          {messages.map((msg, idx) => {
            const isSelfMessage = msg.user?.id === user?.id;
            return (
              <div key={msg.id || idx} className="relative flex items-start justify-between gap-2 text-xs group">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Avatar src={msg.user?.avatarUrl} size="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-zylo-text">{msg.user?.displayName || msg.user?.username || 'User'}</span>
                      {msg.user?.id === stream.broadcasterId && (
                        <span className="rounded bg-zylo-purple px-1 py-0.2 text-[9px] font-black text-white">HOST</span>
                      )}
                    </div>
                    <p className={`mt-0.5 leading-relaxed ${msg.message.startsWith('🎁') ? 'font-bold text-zylo-purple' : 'text-zylo-secondary'}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>

                {isBroadcaster && !isSelfMessage && msg.user?.id && (
                  <div className="relative">
                    <button
                      onClick={() => setActiveModMenuMsgId(activeModMenuMsgId === msg.id ? null : msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zylo-muted hover:text-zylo-purple transition cursor-pointer"
                      title="Moderation options"
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </button>

                    {activeModMenuMsgId === msg.id && (
                      <ChatModerationMenu
                        streamId={stream.id}
                        messageId={msg.id}
                        targetUser={{
                          id: msg.user.id,
                          username: msg.user.username || 'user',
                          displayName: msg.user.displayName,
                        }}
                        isBroadcaster={isBroadcaster}
                        onClose={() => setActiveModMenuMsgId(null)}
                        onMessageDeleted={(mId: string) => {
                          setMessages((prev) => prev.filter((m) => m.id !== mId));
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Broadcaster Chat Input */}
        <div className="p-3 border-t border-zylo-border bg-white">
          <div className="flex items-center gap-2 rounded-2xl border border-zylo-border bg-zylo-warm p-1.5 pl-3">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Chat as broadcaster..."
              className="min-w-0 flex-1 bg-transparent text-xs text-zylo-text outline-none placeholder:text-zylo-muted"
            />
            <button
              onClick={handleSendMessage}
              className="rounded-xl bg-zylo-purple p-2.5 text-white transition hover:bg-[#6926d1]"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* End Stream Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-[#ff426d]" />
            <h3 className="mt-3 text-lg font-extrabold text-zylo-text">End Live Stream?</h3>
            <p className="mt-1 text-xs text-zylo-secondary leading-relaxed">
              Are you sure you want to end the broadcast? Your live room will close for all viewers.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleEndStream}
                disabled={isEnding}
                className="w-full rounded-2xl bg-red-600 py-3 text-xs font-extrabold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isEnding && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEnding ? 'Ending stream...' : 'End Broadcast'}</span>
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={isEnding}
                className="w-full rounded-2xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition cursor-pointer"
              >
                Stay Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Stream Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="mt-3 text-lg font-extrabold text-zylo-text">Cancel Scheduled Stream?</h3>
            <p className="mt-1 text-xs text-zylo-secondary leading-relaxed">
              Are you sure you want to cancel this scheduled stream?
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleCancelStream}
                disabled={isCancelling}
                className="w-full rounded-2xl bg-red-600 py-3 text-xs font-extrabold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isCancelling ? 'Cancelling...' : 'Cancel Stream'}</span>
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="w-full rounded-2xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition cursor-pointer"
              >
                Keep Scheduled
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </CreatorGuard>
  );
}

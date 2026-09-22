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
} from 'lucide-react';
import { Stream, ChatMessage } from '@/lib/types';
import { streamsApi } from '@/lib/api';
import { parseApiError } from '@/lib/api/axios-client';
import { socketClient } from '@/lib/socket';
import { Room, RoomEvent, createLocalTracks, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/shared/Avatar';

export default function LiveControlRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const streamId = (params?.streamId as string) || '';

  const [stream, setStream] = useState<Stream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcaster media state
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard'>('chat');
  const [supporters, setSupporters] = useState<any[]>([]);

  // Edit metadata state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  // Navigation lock warning on page unload while live
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stream?.status === 'LIVE') {
        e.preventDefault();
        e.returnValue = 'You are currently live. Leaving Studio will end your live stream.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stream?.status]);

  // 1. Load Stream Info & Connect LiveKit Publisher
  useEffect(() => {
    if (!streamId) return;

    let isMounted = true;

    async function initControlRoom() {
      setLoading(true);
      setError(null);

      try {
        const data = await streamsApi.getStreamById(streamId);
        if (!isMounted) return;

        setStream(data.stream);
        setEditTitle(data.stream.title);
        setEditDesc(data.stream.description || '');
        setViewerCount(data.stream.viewerCount || 0);

        if (data.stream.status === 'ENDED') {
          setError('This stream has ended.');
          return;
        }

        // Fetch LiveKit publisher token
        const tokenData = await streamsApi.getStreamToken(data.stream.id);

        const room = new Room();
        roomRef.current = room;

        await room.connect(tokenData.livekitUrl, tokenData.token);

        // Create local video and audio tracks directly for instant local preview
        const tracks = await createLocalTracks({ video: true, audio: true });
        const videoTrack = tracks.find((t) => t.kind === 'video') as LocalVideoTrack;
        const audioTrack = tracks.find((t) => t.kind === 'audio') as LocalAudioTrack;

        if (videoTrack) {
          setLocalVideoTrack(videoTrack);
          await room.localParticipant.publishTrack(videoTrack);
        }
        if (audioTrack) {
          await room.localParticipant.publishTrack(audioTrack);
        }
        // Fetch chat history
        try {
          const history = await streamsApi.getChatHistory(data.stream.id);
          if (isMounted && history.length > 0) {
            setMessages(history);
          }
        } catch (err) {
          console.warn('Failed to load chat history:', err);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to initialize Live Control Room');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initControlRoom();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [streamId]);

  // Attach local video track once DOM video element mounts
  useEffect(() => {
    if (localVideoTrack && videoRef.current && isCameraOn && !loading) {
      localVideoTrack.attach(videoRef.current);
    }
  }, [localVideoTrack, loading, isCameraOn]);

  // 2. Elapsed Timer
  useEffect(() => {
    if (stream?.status !== 'LIVE') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stream?.status]);

  // 3. Socket.IO Realtime Chat & Viewer Count
  useEffect(() => {
    if (!streamId) return;

    socketClient.joinStream(streamId);

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleChatDeleted = (data: { streamId: string; messageId: string }) => {
      if (data.streamId === streamId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    };

    const handleViewerCount = (data: { streamId: string; viewerCount: number }) => {
      if (data.streamId === streamId) {
        setViewerCount(data.viewerCount);
      }
    };

    socketClient.on('chat:message', handleMessage);
    socketClient.on('chat:deleted', handleChatDeleted);
    socketClient.on('stream:viewer_count', handleViewerCount);

    return () => {
      socketClient.leaveStream(streamId);
      socketClient.off('chat:message', handleMessage);
      socketClient.off('chat:deleted', handleChatDeleted);
      socketClient.off('stream:viewer_count', handleViewerCount);
    };
  }, [streamId]);

  const handleToggleCamera = async () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    if (roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(newState);
    }
  };

  const handleToggleMic = async () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
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

      // Re-attach local video track to preview element
      const tracks = Array.from(roomRef.current.localParticipant.videoTrackPublications.values());
      const activeTrack = tracks.find((t) => t.track)?.track;
      if (activeTrack && videoRef.current) {
        activeTrack.attach(videoRef.current);
      }
    } catch (err) {
      console.warn('Screen share error:', err);
    }
  };

  const handleSendMessage = () => {
    if (!chatText.trim() || !user) return;
    socketClient.sendChatMessage(streamId, chatText.trim(), user.displayName || user.username, user.avatarUrl || '');
    setChatText('');
  };

  const handleDeleteChatMessage = (messageId: string) => {
    socketClient.emit('chat:delete', { streamId, messageId });
  };

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
        {/* Main viewport skeleton */}
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 gap-5">
          {/* Top control bar */}
          <div className="flex items-center justify-between rounded-3xl border border-zylo-border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-36 rounded-xl bg-[#ECE8F5]" />
              <div className="h-8 w-20 rounded-xl bg-[#ECE8F5]" />
              <div className="h-8 w-24 rounded-xl bg-[#ECE8F5]" />
            </div>
            <div className="h-9 w-32 rounded-xl bg-[#ECE8F5]" />
          </div>
          {/* Video area */}
          <div className="aspect-video w-full rounded-3xl bg-[#ECE8F5] border border-zylo-border" />
          {/* Metadata card */}
          <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-sm space-y-3">
            <div className="h-5 w-48 rounded bg-[#ECE8F5]" />
            <div className="h-6 w-72 rounded bg-[#ECE8F5]" />
            <div className="h-3 w-56 rounded bg-[#ECE8F5]" />
          </div>
        </div>
        {/* Chat sidebar */}
        <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-zylo-border bg-white flex flex-col h-[520px] lg:h-auto">
          <div className="p-4 border-b border-zylo-border">
            <div className="h-4 w-40 rounded bg-[#ECE8F5]" />
          </div>
          <div className="flex-1 p-4 space-y-3 bg-zylo-warm/40">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-[#ECE8F5] shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 w-20 rounded bg-[#ECE8F5]" />
                  <div className="h-2.5 w-36 rounded bg-[#ECE8F5]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-sm font-bold text-red-700">{error || 'Stream not found'}</h3>
        <Link href="/studio" className="mt-4 inline-block text-xs font-bold text-zylo-purple hover:underline">
          Return to Studio
        </Link>
      </div>
    );
  }

  const [startingLive, setStartingLive] = useState(false);

  const handleStartLive = async () => {
    if (!stream) return;
    setStartingLive(true);
    try {
      const res = await streamsApi.startStream(stream.id);
      setStream(res.stream);
    } catch (err: any) {
      alert(err.message || 'Failed to start live stream');
    } finally {
      setStartingLive(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)] bg-zylo-warm text-zylo-text">
      {/* Main Control Viewport */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 gap-5">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between rounded-3xl border border-zylo-border bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            {stream.status === 'LIVE' ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-black tracking-wide text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE CONTROL ROOM
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black tracking-wide text-white shadow-xs">
                PREVIEW / SCHEDULED
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-xl bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-secondary border border-zylo-border">
              <Clock className="h-3.5 w-3.5 text-zylo-purple" /> {formatTimer(elapsedSeconds)}
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-secondary border border-zylo-border">
              <Users className="h-3.5 w-3.5 text-zylo-purple" /> {viewerCount} Viewers
            </span>
          </div>

          <div className="flex items-center gap-2">
            {stream.status === 'SCHEDULED' && (
              <>
                <button
                  onClick={handleStartLive}
                  disabled={startingLive}
                  className="flex items-center gap-2 rounded-xl bg-[#B8FF3D] px-5 py-2 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs disabled:opacity-50"
                >
                  {startingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  <span>START STREAM</span>
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-extrabold text-red-600 hover:bg-red-100 transition shadow-xs"
                >
                  Cancel Stream
                </button>
              </>
            )}

            {stream.status === 'LIVE' && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={isEnding}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-700 transition shadow-xs disabled:opacity-50"
              >
                {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                <span>{isEnding ? 'Ending stream...' : 'End Broadcast'}</span>
              </button>
            )}

            {(stream.status === 'ENDED' || stream.status === 'CANCELLED') && (
              <span className="rounded-xl bg-zylo-warm px-4 py-2 text-xs font-black text-zylo-secondary border border-zylo-border">
                {stream.status === 'ENDED' ? 'STREAM ENDED' : 'STREAM CANCELLED'}
              </span>
            )}
          </div>
        </div>

        {/* LiveKit Video Publisher Preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black border border-zylo-border shadow-xl">
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

          {/* Broadcaster Quick Controls Floating Overlay */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 backdrop-blur-md bg-black/50 p-2 rounded-2xl border border-white/10">
            <button
              onClick={handleToggleCamera}
              className={`rounded-xl p-2.5 transition ${
                isCameraOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'
              }`}
              title="Toggle Camera"
            >
              {isCameraOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={handleToggleMic}
              className={`rounded-xl p-2.5 transition ${
                isMicOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white'
              }`}
              title="Toggle Microphone"
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <button
              onClick={handleToggleScreenShare}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${
                isScreenSharing ? 'bg-zylo-lime text-zylo-text' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title="Share Screen"
            >
              <Monitor className="h-4 w-4" />
              <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
          </div>
        </div>

        {/* Live Stream Metadata Quick-Edit Card */}
        <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-zylo-text">Stream Details (Edit Live)</h3>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <Check className="h-4 w-4" /> Updated!
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zylo-text">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-zylo-purple/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zylo-text">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:ring-2 focus:ring-zylo-purple/20"
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
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-zylo-text">{stream.title}</h1>
                  <p className="mt-1 text-xs text-zylo-secondary">{stream.description || 'No description provided.'}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-zylo-border bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
                >
                  <Edit3 className="h-3.5 w-3.5 text-zylo-purple" /> Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Chat Moderation Sidebar */}
      <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-zylo-border bg-white flex flex-col h-[520px] lg:h-auto">
        <div className="p-4 border-b border-zylo-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#ff426d]" />
            <h3 className="text-sm font-extrabold text-zylo-text">Live Chat Moderation</h3>
          </div>
          <span className="text-xs font-semibold text-zylo-muted">{viewerCount} watching</span>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-zylo-warm/40">
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className="flex items-start justify-between gap-2 text-xs group">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <Avatar src={msg.user?.avatarUrl} size="h-7 w-7" />
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-zylo-text">{msg.user?.displayName || msg.user?.username || 'User'}</span>
                  <p className="mt-0.5 leading-relaxed text-zylo-secondary">{msg.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteChatMessage(msg.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zylo-muted hover:text-red-600 transition"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Broadcaster Chat Composer */}
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

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-[#ff426d]" />
            <h3 className="mt-3 text-lg font-extrabold text-zylo-text">End Live Stream?</h3>
            <p className="mt-1 text-xs text-zylo-secondary leading-relaxed">
              Are you sure you want to end the live stream? This will finalize your broadcast for all viewers.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleEndStream}
                disabled={isEnding}
                className="w-full rounded-2xl bg-red-600 py-3 text-xs font-extrabold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEnding && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEnding ? 'Ending stream...' : 'End Stream'}</span>
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={isEnding}
                className="w-full rounded-2xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
              >
                Stay Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Scheduled Stream Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="mt-3 text-lg font-extrabold text-zylo-text">Cancel Scheduled Stream?</h3>
            <p className="mt-1 text-xs text-zylo-secondary leading-relaxed">
              Are you sure you want to cancel this scheduled stream? Followers will be notified and it will be removed from upcoming feeds.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleCancelStream}
                disabled={isCancelling}
                className="w-full rounded-2xl bg-red-600 py-3 text-xs font-extrabold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isCancelling ? 'Cancelling...' : 'Cancel Stream'}</span>
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="w-full rounded-2xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
              >
                Keep Scheduled
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

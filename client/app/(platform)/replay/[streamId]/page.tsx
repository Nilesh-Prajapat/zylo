'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Stream } from '@/lib/types';
import { streamsApi } from '@/lib/api';
import { Avatar } from '@/components/shared/Avatar';

export default function ReplayPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = (params?.streamId as string) || '';

  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;

    async function loadReplayData() {
      try {
        const data = await streamsApi.getStreamById(streamId);
        setStream(data.stream);

        if (data.stream.status !== 'ENDED') {
          setError('This stream is still active or has not finalized replay video.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load video replay');
      } finally {
        setLoading(false);
      }
    }

    loadReplayData();
  }, [streamId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-zylo-warm">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h3 className="mt-3 text-base font-extrabold text-red-700">{error || 'Replay video not found'}</h3>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zylo-purple px-4 py-2 text-xs font-bold text-white hover:bg-[#6926d1] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const videoSourceUrl =
    stream.replayUrl ||
    stream.mediaPath ||
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 space-y-6">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl border border-zylo-border bg-white px-4 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-warm transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4 text-zylo-purple" /> Back
        </button>

        <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold text-zylo-purple border border-purple-200">
          <Play className="h-3.5 w-3.5 fill-zylo-purple" /> STREAM REPLAY
        </span>
      </div>

      {/* Seekable Video Player Viewport */}
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black border border-zylo-border shadow-2xl">
        <video
          controls
          controlsList="nodownload"
          poster={stream.thumbnailUrl || undefined}
          src={videoSourceUrl}
          className="h-full w-full object-contain"
        >
          Your browser does not support playing HTML5 video replays.
        </video>
      </div>

      {/* Stream Video Info */}
      <div className="rounded-3xl border border-zylo-border bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zylo-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zylo-muted mb-1">
              <span className="font-extrabold text-zylo-purple">{stream.vibe || 'Just Chatting'}</span>
              <span>• Broadcast ended {stream.endedAt ? new Date(stream.endedAt).toLocaleDateString() : new Date(stream.createdAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zylo-text">{stream.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-xl bg-zylo-warm px-3 py-1.5 text-xs font-bold text-zylo-secondary border border-zylo-border">
              {stream.visibility === 'PRIVATE' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5 text-zylo-purple" />}
              {stream.visibility || 'PUBLIC'}
            </span>
          </div>
        </div>

        {/* Creator Identity Bar */}
        <div className="flex items-center gap-3">
          <Avatar src={stream.broadcaster?.avatarUrl} size="h-10 w-10" />
          <div>
            <h3 className="text-sm font-extrabold text-zylo-text">
              {stream.broadcaster?.displayName || stream.broadcaster?.username || 'Creator'}
            </h3>
            <p className="text-xs text-zylo-muted">@{stream.broadcaster?.username}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zylo-secondary leading-relaxed">
          {stream.description || 'No description was provided for this stream recording.'}
        </p>
      </div>
    </div>
  );
}

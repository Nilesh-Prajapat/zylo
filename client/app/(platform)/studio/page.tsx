'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Radio,
  Calendar,
  ArrowRight,
  Loader2,
  Plus,
  Play,
  Globe,
  EyeOff,
  Lock,
  MessageSquare,
  Gem,
  Save,
  ChevronRight,
  Upload,
  X,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Stream } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
  useMyActiveStream,
  useCreatorStreams,
  useCreatorStats,
  useCreateStream,
} from '@/lib/hooks/use-queries';
import { mediaApi } from '@/lib/api';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomToggle } from '@/components/ui/CustomToggle';

const CATEGORIES = [
  'Just Chatting',
  'Gaming',
  'Tech & Dev',
  'Music & Beats',
  'Creative & Art',
  'IRL & Vlogs',
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hindi', 'Arabic'];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe },
  { value: 'UNLISTED', label: 'Unlisted', icon: EyeOff },
  { value: 'PRIVATE', label: 'Private', icon: Lock },
];

export default function StudioDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: activeStream, isLoading: activeLoading } = useMyActiveStream();
  const { data: streamsData, isLoading: streamsLoading } = useCreatorStreams({ page: 1, pageSize: 6 });
  const { data: stats, isLoading: statsLoading } = useCreatorStats();
  const createStreamMutation = useCreateStream();

  const myStreams = streamsData?.items || [];
  const totalCount = streamsData?.pagination?.total || 0;

  // Stream Creation Flow State
  const [showModal, setShowModal] = useState(false);
  const [entryOption, setEntryOption] = useState<'NOW' | 'SCHEDULED' | null>(null);

  // Stream Setup Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Just Chatting');
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('PUBLIC');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [enableGifts, setEnableGifts] = useState(true);
  const [saveRecording, setSaveRecording] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  const resetFlow = () => {
    setEntryOption(null);
    setTitle('');
    setDescription('');
    setCategory('Just Chatting');
    setLanguage('English');
    setVisibility('PUBLIC');
    setScheduledDate('');
    setScheduledTime('');
    setThumbnailUrl('');
    setThumbnailFile(null);
    setThumbnailPreview('');
    setEnableChat(true);
    setEnableGifts(true);
    setSaveRecording(true);
    setModalError(null);
  };

  const handleOpenStartStreaming = useCallback(() => {
    resetFlow();
    setShowModal(true);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('golive') === 'true') {
        handleOpenStartStreaming();
      }
    }
  }, [handleOpenStartStreaming]);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setModalError('Invalid file type. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalError('File too large. Maximum 5MB.');
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setModalError(null);
  };

  const uploadThumbnail = async (): Promise<string | undefined> => {
    if (!thumbnailFile) return thumbnailUrl || undefined;

    setUploading(true);
    try {
      const res = await mediaApi.uploadFile(thumbnailFile, 'STREAM_THUMBNAIL');
      if (!res?.url) throw new Error('Thumbnail upload failed');
      setThumbnailUrl(res.url);
      return res.url;
    } catch (err: any) {
      setModalError(err.message || 'Thumbnail upload failed');
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateStream = async () => {
    if (!title.trim()) {
      setModalError('Stream title is required.');
      return;
    }

    if (entryOption === 'SCHEDULED') {
      if (!scheduledDate || !scheduledTime) {
        setModalError('Please select both date and time for scheduled live stream.');
        return;
      }
    }

    setModalError(null);

    try {
      let finalThumbnail = thumbnailUrl;
      if (thumbnailFile) {
        const uploaded = await uploadThumbnail();
        if (!uploaded && thumbnailFile) return;
        finalThumbnail = uploaded || '';
      }

      let scheduledAtIso: string | undefined = undefined;
      if (entryOption === 'SCHEDULED' && scheduledDate && scheduledTime) {
        const dateObj = new Date(`${scheduledDate}T${scheduledTime}`);
        scheduledAtIso = dateObj.toISOString();
      }

      const res = await createStreamMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: finalThumbnail || undefined,
        visibility,
        language,
        enableChat,
        enableGifts,
        saveRecording,
        scheduledAt: scheduledAtIso,
      });

      const streamId = res.stream?.id || res.id;
      if (streamId) {
        setShowModal(false);
        // Both GO LIVE NOW and SCHEDULE LIVE converge into the COMMON STREAM STUDIO
        router.push(`/stream/${streamId}/studio`);
      }
    } catch (err: any) {
      setModalError(err?.response?.data?.error?.message || err.message || 'Failed to configure stream');
    }
  };

  const loading = activeLoading || streamsLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex flex-col h-full flex-1 min-h-0 bg-zylo-warm overflow-hidden select-none">
        <div className="flex-1 flex flex-col p-4 lg:p-5 space-y-3.5 overflow-hidden min-h-0 animate-pulse">
          <div className="h-28 lg:h-32 w-full rounded-3xl bg-[#ECE8F5] shrink-0" />
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 overflow-hidden">
            <div className="lg:col-span-4 flex flex-col gap-3 shrink-0">
              <div className="h-44 rounded-3xl bg-[#ECE8F5]" />
              <div className="h-24 rounded-3xl bg-[#ECE8F5]" />
            </div>
            <div className="lg:col-span-8 rounded-3xl bg-[#ECE8F5] h-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 bg-zylo-warm overflow-hidden select-none">
      {/* Active Broadcast Banner */}
      {activeStream && (
        <div className="flex items-center justify-between border-b border-zylo-border bg-white px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B8FF3D] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B8FF3D]" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zylo-purple">Active Broadcast</span>
              <h2 className="text-sm font-extrabold text-zylo-text">{activeStream.title}</h2>
            </div>
          </div>

          <Link
            href={`/stream/${activeStream.id}/studio`}
            className="flex items-center gap-1.5 rounded-xl bg-zylo-purple px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-xs"
          >
            Stream Studio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col p-4 lg:p-5 space-y-3.5 overflow-hidden min-h-0">
        {!activeStream && (
          <div
            onClick={handleOpenStartStreaming}
            className="relative h-28 lg:h-32 w-full rounded-3xl overflow-hidden shadow-xs shrink-0 cursor-pointer group transition-transform hover:scale-[0.998]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ready_to_live.png" alt="Ready to go live" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center px-6 lg:px-8">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-[#18181B] tracking-tight">Ready to go live?</h2>
                <p className="mt-1 text-xs lg:text-sm font-extrabold text-[#3F3F46]">
                  Go live now or schedule a broadcast for your audience.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 overflow-hidden">
          {/* Creator Overview & Actions */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden shrink-0">
            <div className="rounded-3xl border border-zylo-border bg-white p-4 shadow-xs space-y-2.5 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-zylo-muted">Creator Overview</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-zylo-border pb-2">
                  <span className="text-xs font-bold text-zylo-secondary">Total Streams</span>
                  <span className="text-lg font-black text-zylo-text">{stats?.totalStreams ?? 0}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zylo-border pb-2">
                  <span className="text-xs font-bold text-zylo-secondary">Total Views</span>
                  <span className="text-lg font-black text-zylo-text">{stats?.totalViews ?? 0}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zylo-border pb-2">
                  <span className="text-xs font-bold text-zylo-secondary">Followers</span>
                  <span className="text-lg font-black text-zylo-text">{stats?.followers ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zylo-secondary">Total Gifts</span>
                  <span className="text-lg font-black text-zylo-text">✦ {stats?.totalGifts ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zylo-border bg-white p-4 shadow-xs shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${activeStream ? 'bg-[#B8FF3D] border border-green-600' : 'bg-gray-300 border border-gray-400'}`} />
                <span className="text-xs font-extrabold text-zylo-text">{activeStream ? 'Live Now' : 'Offline'}</span>
              </div>
              <button
                onClick={handleOpenStartStreaming}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B8FF3D] py-3 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 text-black fill-black" /> Start New Broadcast
              </button>
            </div>
          </div>

          {/* All Streams Table */}
          <div className="lg:col-span-8 flex flex-col rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden h-full min-h-0">
            <div className="p-4 border-b border-zylo-border flex items-center justify-between shrink-0">
              <h2 className="text-sm font-extrabold text-zylo-text">All Streams</h2>
              <Link href="/studio/streams" className="flex items-center gap-1 text-xs font-bold text-zylo-purple hover:underline">
                View All ({totalCount}) <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zylo-border min-h-0">
              {myStreams.length > 0 ? (
                myStreams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-3.5 hover:bg-zylo-warm/40 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative h-11 w-18 rounded-xl bg-zylo-warm overflow-hidden border border-zylo-border shrink-0">
                        {stream.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={stream.thumbnailUrl} alt={stream.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zylo-muted">
                            <Video className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase ${
                            stream.status === 'LIVE' ? 'text-[#6D9E1C]' :
                            stream.status === 'SCHEDULED' ? 'text-zylo-purple' :
                            'text-zylo-muted'
                          }`}>{stream.status}</span>
                          <span className="text-[10px] text-zylo-muted">• {new Date(stream.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xs font-extrabold text-zylo-text truncate">{stream.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/stream/${stream.id}/studio`}
                        className="rounded-xl bg-zylo-warm border border-zylo-border px-3 py-1.5 text-xs font-extrabold text-zylo-text hover:bg-zylo-soft transition"
                      >
                        Studio
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zylo-muted">
                  <Video className="mx-auto h-8 w-8 mb-2 text-zylo-border" />
                  <p className="text-xs font-semibold">No streams yet. Create your first broadcast!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Start Streaming Modal: Entry Choice & Setup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-5 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zylo-border pb-3">
              <div>
                <span className="text-[10px] font-black text-zylo-purple uppercase">Broadcaster Setup</span>
                <h2 className="text-lg font-extrabold text-zylo-text">
                  {!entryOption ? 'Start Streaming' : entryOption === 'NOW' ? 'Go Live Now' : 'Schedule Live'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            {/* Step 1: Entry Options Selection */}
            {!entryOption && (
              <div className="space-y-4 py-2">
                <p className="text-xs font-bold text-zylo-secondary text-center">
                  Choose how you want to configure your broadcast:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setEntryOption('NOW')}
                    className="flex flex-col items-center p-6 rounded-2xl border-2 border-zylo-border bg-zylo-warm hover:border-zylo-purple hover:bg-white transition text-center group cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-[#B8FF3D] flex items-center justify-center mb-3 shadow-xs">
                      <Radio className="h-6 w-6 text-black" />
                    </div>
                    <h3 className="text-sm font-black text-zylo-text group-hover:text-zylo-purple">GO LIVE NOW</h3>
                    <p className="mt-1 text-[11px] font-semibold text-zylo-secondary leading-snug">
                      Prepare a stream to broadcast right away in Stream Studio.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryOption('SCHEDULED')}
                    className="flex flex-col items-center p-6 rounded-2xl border-2 border-zylo-border bg-zylo-warm hover:border-zylo-purple hover:bg-white transition text-center group cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-zylo-purple flex items-center justify-center mb-3 shadow-xs text-white">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-black text-zylo-text group-hover:text-zylo-purple">SCHEDULE LIVE</h3>
                    <p className="mt-1 text-[11px] font-semibold text-zylo-secondary leading-snug">
                      Set a future date and time for your upcoming stream.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Form for GO LIVE NOW / SCHEDULE LIVE */}
            {entryOption && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-zylo-text block mb-1">
                    Stream Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Building Zylo Live & Q&A 🚀"
                    className="h-11 w-full rounded-2xl border border-zylo-border bg-zylo-warm px-4 text-xs font-semibold outline-none focus:border-zylo-purple transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-zylo-text block mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Describe your broadcast..."
                    className="w-full rounded-2xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:border-zylo-purple transition"
                  />
                </div>

                {/* Scheduling Date & Time Pickers for SCHEDULE LIVE */}
                {entryOption === 'SCHEDULED' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl border border-amber-200 bg-amber-50">
                    <div>
                      <label className="text-xs font-extrabold text-amber-900 block mb-1">
                        Scheduled Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-amber-900 block mb-1">
                        Scheduled Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold text-zylo-text block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          category === cat
                            ? 'bg-zylo-purple text-white'
                            : 'border border-zylo-border bg-zylo-warm text-zylo-secondary hover:bg-zylo-soft'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-zylo-text block mb-1.5">Language</label>
                    <CustomSelect options={LANGUAGES} value={language} onChange={setLanguage} />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-zylo-text block mb-1.5">Visibility</label>
                    <CustomSelect
                      options={VISIBILITY_OPTIONS}
                      value={visibility}
                      onChange={(v) => setVisibility(v as 'PUBLIC' | 'UNLISTED' | 'PRIVATE')}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zylo-border">
                  <CustomToggle
                    checked={enableChat}
                    onChange={setEnableChat}
                    label="Enable Chat"
                    description="Allow viewers to send messages"
                    icon={MessageSquare}
                  />
                  <CustomToggle
                    checked={enableGifts}
                    onChange={setEnableGifts}
                    label="Enable Gifts"
                    description="Allow viewers to send virtual gifts"
                    icon={Gem}
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-zylo-border">
                  <button
                    type="button"
                    onClick={() => setEntryOption(null)}
                    className="rounded-2xl border border-zylo-border bg-zylo-warm px-5 py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
                  >
                    ← Option
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateStream}
                    disabled={createStreamMutation.isPending || uploading}
                    className="flex-1 rounded-2xl bg-[#B8FF3D] py-3 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {createStreamMutation.isPending ? 'Preparing Stream Studio...' : 'Continue to Stream Studio →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

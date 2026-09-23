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
  BarChart3,
} from 'lucide-react';
import { Stream } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Skeleton, TableRowSkeleton } from '@/components/shared/Skeletons';
import {
  useMyActiveStream,
  useCreatorStreams,
  useCreatorStats,
  useCreateStream,
} from '@/lib/hooks/use-queries';
import { mediaApi } from '@/lib/api';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomToggle } from '@/components/ui/CustomToggle';
import { ThumbnailUploader } from '@/components/studio/ThumbnailUploader';

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
  const [step, setStep] = useState<number>(1);
  const [modalError, setModalError] = useState<string | null>(null);

  const resetFlow = () => {
    setEntryOption(null);
    setStep(1);
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

  // Render page shell immediately — no early full-page skeleton return!

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
                  {statsLoading ? <Skeleton className="h-5 w-12 rounded" /> : <span className="text-lg font-black text-zylo-text">{stats?.totalStreams ?? 0}</span>}
                </div>
                <div className="flex items-center justify-between border-b border-zylo-border pb-2">
                  <span className="text-xs font-bold text-zylo-secondary">Total Views</span>
                  {statsLoading ? <Skeleton className="h-5 w-12 rounded" /> : <span className="text-lg font-black text-zylo-text">{stats?.totalViews ?? 0}</span>}
                </div>
                <div className="flex items-center justify-between border-b border-zylo-border pb-2">
                  <span className="text-xs font-bold text-zylo-secondary">Followers</span>
                  {statsLoading ? <Skeleton className="h-5 w-12 rounded" /> : <span className="text-lg font-black text-zylo-text">{stats?.followers ?? 0}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zylo-secondary">Total Gifts</span>
                  {statsLoading ? <Skeleton className="h-5 w-12 rounded" /> : <span className="text-lg font-black text-zylo-text">✦ {stats?.totalGifts ?? 0}</span>}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zylo-border bg-white p-4 shadow-xs shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${activeStream ? 'bg-[#B8FF3D] border border-green-600' : 'bg-gray-300 border border-gray-400'}`} />
                <span className="text-xs font-extrabold text-zylo-text">{activeLoading ? 'Checking...' : activeStream ? 'Live Now' : 'Offline'}</span>
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
              {streamsLoading ? (
                <div className="p-4 space-y-3">
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </div>
              ) : myStreams.length > 0 ? (
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
                      {stream.status === 'ENDED' ? (
                        <Link
                          href={`/studio/streams/${stream.id}`}
                          className="flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200/80 px-3 py-1.5 text-xs font-black text-zylo-purple hover:bg-purple-100 transition shadow-2xs"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          View Stats
                        </Link>
                      ) : (
                        <Link
                          href={`/stream/${stream.id}/studio`}
                          className="rounded-xl bg-zylo-warm border border-zylo-border px-3 py-1.5 text-xs font-extrabold text-zylo-text hover:bg-zylo-soft transition"
                        >
                          Studio
                        </Link>
                      )}
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

      {/* Start Streaming Modal: Fixed-size Dialog with Multi-step Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg h-[620px] max-h-[85vh] rounded-3xl border border-zylo-border bg-white shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="shrink-0 border-b border-zylo-border px-6 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-zylo-purple uppercase tracking-wider">Broadcaster Setup</span>
                  <h2 className="text-lg font-extrabold text-zylo-text">
                    {!entryOption
                      ? 'Start Streaming'
                      : entryOption === 'NOW'
                      ? `Go Live Now — Step ${step} of 3`
                      : `Schedule Live — Step ${step} of 4`}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setModalError(null);
                  }}
                  className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Stepper Progress Indicator */}
              {entryOption && (
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zylo-secondary border-t border-zylo-border/60 pt-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full transition ${step === 1 ? 'bg-zylo-purple text-white shadow-xs' : step > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-zylo-warm text-zylo-muted'}`}>
                    {step > 1 ? '✓ Details' : '1. Details'}
                  </span>
                  <span className="text-zylo-muted">›</span>
                  <span className={`px-2.5 py-0.5 rounded-full transition ${step === 2 ? 'bg-zylo-purple text-white shadow-xs' : step > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-zylo-warm text-zylo-muted'}`}>
                    {step > 2 ? '✓ Media' : '2. Media'}
                  </span>
                  <span className="text-zylo-muted">›</span>

                  {entryOption === 'SCHEDULED' ? (
                    <>
                      <span className={`px-2.5 py-0.5 rounded-full transition ${step === 3 ? 'bg-zylo-purple text-white shadow-xs' : step > 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-zylo-warm text-zylo-muted'}`}>
                        {step > 3 ? '✓ Schedule' : '3. Schedule'}
                      </span>
                      <span className="text-zylo-muted">›</span>
                      <span className={`px-2.5 py-0.5 rounded-full transition ${step === 4 ? 'bg-zylo-purple text-white shadow-xs' : 'bg-zylo-warm text-zylo-muted'}`}>
                        4. Settings
                      </span>
                    </>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-full transition ${step === 3 ? 'bg-zylo-purple text-white shadow-xs' : 'bg-zylo-warm text-zylo-muted'}`}>
                      3. Settings
                    </span>
                  )}
                  <span className="text-zylo-muted">›</span>
                  <span className="px-2 py-0.5 rounded-full bg-zylo-warm text-zylo-muted">Studio</span>
                </div>
              )}
            </div>

            {/* Scrollable Content Container (Fixed Height flex-1) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {modalError && (
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {modalError}
                </div>
              )}

              {/* ENTRY SELECTION */}
              {!entryOption && (
                <div className="space-y-4 py-2">
                  <p className="text-xs font-bold text-zylo-secondary text-center">
                    Choose how you want to configure your broadcast:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryOption('NOW');
                        setStep(1);
                        setModalError(null);
                      }}
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
                      onClick={() => {
                        setEntryOption('SCHEDULED');
                        setStep(1);
                        setModalError(null);
                      }}
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

              {/* STEP 1: DETAILS (Title & Description) */}
              {entryOption && step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-zylo-warm/50 p-4 border border-zylo-border/60">
                    <h4 className="text-xs font-extrabold text-zylo-text mb-1">Step 1: Broadcast Details</h4>
                    <p className="text-[11px] font-medium text-zylo-muted">
                      Give your stream a catchy title and description so viewers know what to expect.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-zylo-text block mb-1">
                      Stream Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      placeholder="e.g. Building Zylo Live & Q&A 🚀"
                      className="h-11 w-full rounded-2xl border border-zylo-border bg-zylo-warm px-4 text-xs font-semibold outline-none focus:border-zylo-purple transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-zylo-text block mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Tell viewers what your broadcast is about..."
                      className="w-full rounded-2xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:border-zylo-purple transition resize-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: MEDIA & CATEGORY */}
              {entryOption && step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-zylo-warm/50 p-4 border border-zylo-border/60">
                    <h4 className="text-xs font-extrabold text-zylo-text mb-1">Step 2: Media & Category</h4>
                    <p className="text-[11px] font-medium text-zylo-muted">
                      Upload an eye-catching thumbnail image and choose a category for discovery.
                    </p>
                  </div>

                  {/* Thumbnail Uploader */}
                  <ThumbnailUploader value={thumbnailUrl} onChange={setThumbnailUrl} />

                  <div>
                    <label className="text-xs font-extrabold text-zylo-text block mb-2">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            category === cat
                              ? 'bg-zylo-purple text-white shadow-xs'
                              : 'border border-zylo-border bg-zylo-warm text-zylo-secondary hover:bg-zylo-soft'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 (FOR SCHEDULED): SCHEDULE DATE & TIME */}
              {entryOption === 'SCHEDULED' && step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      Select Scheduled Date & Time
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-extrabold text-amber-900 block mb-1">
                          Scheduled Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            setScheduledDate(e.target.value);
                            if (modalError) setModalError(null);
                          }}
                          className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-amber-900 block mb-1">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            if (modalError) setModalError(null);
                          }}
                          className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 outline-none"
                        />
                      </div>
                    </div>

                    {scheduledDate && scheduledTime && (
                      <div className="p-3 rounded-xl bg-white border border-amber-200 text-center shadow-2xs">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Scheduled for</span>
                        <span className="text-xs font-black text-amber-900">
                          {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FINAL STEP (STEP 3 FOR NOW, STEP 4 FOR SCHEDULED): SETTINGS & PREFERENCES */}
              {entryOption && ((entryOption === 'NOW' && step === 3) || (entryOption === 'SCHEDULED' && step === 4)) && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-zylo-warm/50 p-4 border border-zylo-border/60">
                    <h4 className="text-xs font-extrabold text-zylo-text mb-1">Final Step: Stream Settings</h4>
                    <p className="text-[11px] font-medium text-zylo-muted">
                      Configure visibility, language, chat, and gift interactions before entering studio.
                    </p>
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
                      description="Allow viewers to send realtime chat messages"
                      icon={MessageSquare}
                    />
                    <CustomToggle
                      checked={enableGifts}
                      onChange={setEnableGifts}
                      label="Enable Gifts"
                      description="Allow viewers to send animated gifts"
                      icon={Gem}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer Navigation */}
            {entryOption && (
              <div className="shrink-0 border-t border-zylo-border bg-white px-6 py-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1) {
                      setEntryOption(null);
                      setStep(1);
                    } else {
                      setStep(step - 1);
                    }
                    setModalError(null);
                  }}
                  className="rounded-2xl border border-zylo-border bg-zylo-warm px-4 py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition cursor-pointer"
                >
                  ← {step === 1 ? 'Choose Flow' : 'Back'}
                </button>

                {/* Next or Finish Button */}
                {((entryOption === 'NOW' && step < 3) || (entryOption === 'SCHEDULED' && step < 4)) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        if (!title.trim()) {
                          setModalError('Stream title is required.');
                          return;
                        }
                      }
                      if (entryOption === 'SCHEDULED' && step === 3) {
                        if (!scheduledDate || !scheduledTime) {
                          setModalError('Please select both scheduled date and time.');
                          return;
                        }
                      }
                      setModalError(null);
                      setStep(step + 1);
                    }}
                    className="rounded-2xl bg-zylo-purple px-6 py-2.5 text-xs font-extrabold text-white hover:bg-zylo-purple-hover transition shadow-md cursor-pointer"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateStream}
                    disabled={createStreamMutation.isPending || uploading}
                    className="flex-1 max-w-xs rounded-2xl bg-[#B8FF3D] py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {createStreamMutation.isPending ? 'Preparing Stream Studio...' : 'Continue to Stream Studio →'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

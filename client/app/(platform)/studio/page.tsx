'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Radio,
  Calendar,
  Eye,
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
  Users,
  ChevronRight,
  Upload,
  Settings,
  CheckCircle,
  X,
  Image as ImageIcon,
  AlertCircle,
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

  // Go Live Wizard State
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Just Chatting');
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('PUBLIC');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [enableGifts, setEnableGifts] = useState(true);
  const [saveRecording, setSaveRecording] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  const resetWizard = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setCategory('Just Chatting');
    setLanguage('English');
    setVisibility('PUBLIC');
    setThumbnailUrl('');
    setThumbnailFile(null);
    setThumbnailPreview('');
    setEnableChat(true);
    setEnableGifts(true);
    setSaveRecording(true);
    setModalError(null);
  };

  const handleOpenGoLive = useCallback(() => {
    resetWizard();
    setShowGoLiveModal(true);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('golive') === 'true') {
        handleOpenGoLive();
      }
    }
  }, [handleOpenGoLive]);

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
      if (!res?.url) {
        throw new Error('Thumbnail upload failed');
      }
      setThumbnailUrl(res.url);
      return res.url;
    } catch (err: any) {
      setModalError(err.message || 'Thumbnail upload failed');
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleStartStream = async () => {
    if (!title.trim()) {
      setModalError('Stream title is required.');
      return;
    }

    setModalError(null);

    try {
      // Upload thumbnail if selected
      let finalThumbnail = thumbnailUrl;
      if (thumbnailFile) {
        const uploaded = await uploadThumbnail();
        if (!uploaded && thumbnailFile) return; // upload failed
        finalThumbnail = uploaded || '';
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
      });

      const streamId = res.stream?.id || res.id;
      if (streamId) {
        setShowGoLiveModal(false);
        router.push(`/studio/live/${streamId}`);
      }
    } catch (err: any) {
      setModalError(err?.response?.data?.error?.message || err.message || 'Failed to launch live stream');
    }
  };

  const loading = activeLoading || streamsLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-zylo-warm">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 bg-zylo-warm overflow-hidden select-none">
      {/* Active Broadcast Alert — shown when LIVE */}
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
            href={`/studio/live/${activeStream.id}`}
            className="flex items-center gap-1.5 rounded-xl bg-zylo-purple px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-xs"
          >
            Control Room <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Main container - strict 100vh fitting */}
      <div className="flex-1 flex flex-col p-4 lg:p-5 space-y-3.5 overflow-hidden min-h-0">
        {/* Ready to Go Live Banner */}
        {!activeStream && (
          <div
            onClick={handleOpenGoLive}
            className="relative h-28 lg:h-32 w-full rounded-3xl overflow-hidden shadow-xs shrink-0 cursor-pointer group transition-transform hover:scale-[0.998]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ready_to_live.png"
              alt="Ready to go live"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center px-6 lg:px-8">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-[#18181B] tracking-tight">
                  Ready to go live?
                </h2>
                <p className="mt-1 text-xs lg:text-sm font-extrabold text-[#3F3F46]">
                  Share your moment with your audience.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Creator Overview + Quick Actions Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 overflow-hidden">
          {/* Left: Creator Overview */}
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
                <span className="text-xs font-extrabold text-zylo-text">
                  {activeStream ? 'Live Now' : 'Offline'}
                </span>
              </div>
              <button
                onClick={handleOpenGoLive}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B8FF3D] py-3 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 text-black fill-black" /> Start New Broadcast
              </button>
            </div>
          </div>

          {/* Right: All Streams Preview */}
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
                      {stream.status === 'LIVE' && (
                        <Link
                          href={`/studio/live/${stream.id}`}
                          className="rounded-xl bg-zylo-purple px-3 py-1.5 text-xs font-extrabold text-white"
                        >
                          Control Room
                        </Link>
                      )}
                      {stream.status === 'ENDED' && stream.allowReplay && (
                        <Link
                          href={`/stream/${stream.id}`}
                          className="flex items-center gap-1 rounded-xl bg-zylo-warm border border-zylo-border px-3 py-1.5 text-xs font-bold text-zylo-text"
                        >
                          <Play className="h-3 w-3 text-zylo-purple" /> Replay
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zylo-muted">
                  <Video className="mx-auto h-8 w-8 mb-2 text-zylo-border" />
                  <p className="text-xs font-semibold">No streams yet. Start your first broadcast!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Go Live Wizard Modal */}
      {showGoLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-5 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zylo-border pb-3">
              <div>
                <span className="text-[10px] font-black text-zylo-purple uppercase">Step {step} of 4</span>
                <h2 className="text-lg font-extrabold text-zylo-text">
                  {step === 1 ? 'Broadcast Details' :
                   step === 2 ? 'Thumbnail' :
                   step === 3 ? 'Stream Settings' :
                   'Review & Go Live'}
                </h2>
              </div>
              <button
                onClick={() => setShowGoLiveModal(false)}
                className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-zylo-purple' : 'bg-zylo-border'
                  }`}
                />
              ))}
            </div>

            {modalError && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
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
                    placeholder="Describe your broadcast for your audience..."
                    className="w-full rounded-2xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:border-zylo-purple transition"
                  />
                </div>

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
                    <CustomSelect
                      options={LANGUAGES}
                      value={language}
                      onChange={setLanguage}
                    />
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

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!title.trim()) { setModalError('Please enter a stream title.'); return; }
                      setModalError(null);
                      setStep(2);
                    }}
                    className="rounded-2xl bg-zylo-purple px-6 py-3 text-xs font-extrabold text-white hover:bg-[#6926d1] transition"
                  >
                    Next: Thumbnail →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Thumbnail */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-zylo-text block mb-2">
                    Upload Thumbnail <span className="text-zylo-muted font-normal">(Optional)</span>
                  </label>
                  <div className="relative border-2 border-dashed border-zylo-border rounded-2xl p-6 text-center hover:border-zylo-purple/50 transition bg-zylo-warm/50">
                    {thumbnailPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="mx-auto max-h-40 rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); setThumbnailUrl(''); }}
                          className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-zylo-muted" />
                        <p className="text-xs font-bold text-zylo-secondary">
                          Drag & drop or <span className="text-zylo-purple">click to upload</span>
                        </p>
                        <p className="text-[10px] text-zylo-muted">JPG, PNG, WEBP • Max 5MB</p>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleThumbnailSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-2xl border border-zylo-border bg-zylo-warm px-5 py-3 text-xs font-bold text-zylo-text"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalError(null); setStep(3); }}
                    className="flex-1 rounded-2xl bg-zylo-purple py-3 text-xs font-extrabold text-white hover:bg-[#6926d1] transition"
                  >
                    Next: Settings →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
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

                  <CustomToggle
                    checked={saveRecording}
                    onChange={setSaveRecording}
                    label="Save Recording"
                    description="Save a replay of this broadcast"
                    icon={Save}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-2xl border border-zylo-border bg-zylo-warm px-5 py-3 text-xs font-bold text-zylo-text"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalError(null); setStep(4); }}
                    className="flex-1 rounded-2xl bg-zylo-purple py-3 text-xs font-extrabold text-white hover:bg-[#6926d1] transition"
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Launch */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zylo-border bg-zylo-warm/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Title</span>
                    <span className="text-xs font-extrabold text-zylo-text">{title}</span>
                  </div>
                  {description && (
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold text-zylo-muted uppercase">Description</span>
                      <span className="text-xs text-zylo-secondary text-right max-w-[200px] truncate">{description}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Category</span>
                    <span className="text-xs font-bold text-zylo-text">{category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Language</span>
                    <span className="text-xs font-bold text-zylo-text">{language}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Visibility</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-zylo-text">
                      {visibility === 'PUBLIC' ? <Globe className="h-3 w-3" /> :
                       visibility === 'UNLISTED' ? <EyeOff className="h-3 w-3" /> :
                       <Lock className="h-3 w-3" />}
                      {visibility}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Thumbnail</span>
                    <span className="text-xs font-bold text-zylo-text">{thumbnailFile ? '✓ Uploaded' : 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Chat</span>
                    <span className="text-xs font-bold text-zylo-text">{enableChat ? '✓ Enabled' : '✗ Disabled'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Gifts</span>
                    <span className="text-xs font-bold text-zylo-text">{enableGifts ? '✓ Enabled' : '✗ Disabled'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zylo-muted uppercase">Recording</span>
                    <span className="text-xs font-bold text-zylo-text">{saveRecording ? '✓ Enabled' : '✗ Disabled'}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-zylo-border">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-2xl border border-zylo-border bg-zylo-warm px-5 py-3 text-xs font-bold text-zylo-text"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStartStream}
                    disabled={createStreamMutation.isPending || uploading}
                    className="flex-1 rounded-2xl bg-[#B8FF3D] py-3 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {uploading
                      ? 'Uploading thumbnail...'
                      : createStreamMutation.isPending
                      ? 'Starting live stream...'
                      : '🟢 Start Live Broadcast'}
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

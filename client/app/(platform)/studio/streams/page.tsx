'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Video,
  Radio,
  Search,
  Trash2,
  Edit3,
  Loader2,
  Eye,
  EyeOff,
  Play,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
} from 'lucide-react';
import { Stream } from '@/lib/types';
import { streamsApi } from '@/lib/api';
import { ThumbnailUploader } from '@/components/studio/ThumbnailUploader';

export default function StreamManagerPage() {
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [streams, setStreams] = useState<Stream[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit stream state
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('PUBLIC');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await streamsApi.getMyStreams({
        page,
        pageSize: 15,
        search: searchQuery,
        status: filter === 'ALL' ? undefined : filter,
      });
      setStreams(res.items);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.total);
    } catch (err) {
      console.error('Failed to fetch streams:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, searchQuery]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (status: 'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED') => {
    setFilter(status);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stream?')) return;
    try {
      await streamsApi.deleteStream(id);
      fetchStreams();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stream');
    }
  };

  const handleTogglePublication = async (stream: Stream) => {
    const nextStatus = stream.publicationStatus === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN';
    try {
      await streamsApi.updatePublication(stream.id, nextStatus);
      setStreams((prev) =>
        prev.map((s) => (s.id === stream.id ? { ...s, publicationStatus: nextStatus } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update publication status');
    }
  };

  const openEditModal = (stream: Stream) => {
    setEditingStream(stream);
    setEditTitle(stream.title);
    setEditDesc(stream.description || '');
    setEditThumbnail(stream.thumbnailUrl || '');
    setEditVisibility((stream.visibility as 'PUBLIC' | 'UNLISTED' | 'PRIVATE') || 'PUBLIC');
  };

  const handleSaveEdit = async () => {
    if (!editingStream) return;
    setSavingEdit(true);
    try {
      await streamsApi.updateStream(editingStream.id, {
        title: editTitle,
        description: editDesc,
        thumbnailUrl: editThumbnail,
        visibility: editVisibility,
      });
      setEditingStream(null);
      fetchStreams();
    } catch (err: any) {
      alert(err.message || 'Failed to update stream details');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-zylo-warm p-5 lg:p-8 space-y-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zylo-purple">
            <Video className="h-4 w-4 text-[#B8FF3D] fill-[#B8FF3D]" /> All Streams Library
          </div>
          <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold tracking-tight text-zylo-text">
            Creator Content & Video Library
          </h1>
        </div>

        <Link
          href="/studio?golive=true"
          className="flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-md"
        >
          <Radio className="h-4 w-4 text-[#B8FF3D]" /> Launch Broadcast
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide border border-zylo-border bg-white p-1 rounded-2xl">
          {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleFilterChange(tab)}
              className={`rounded-xl px-4 py-1.5 text-xs font-extrabold transition ${
                filter === tab
                  ? 'bg-zylo-purple text-white shadow-xs'
                  : 'text-zylo-secondary hover:bg-zylo-warm'
              }`}
            >
              {tab === 'LIVE' ? '● LIVE' : tab}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zylo-muted" />
          <input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search streams by title..."
            className="h-10 w-full rounded-2xl border border-zylo-border bg-white pl-10 pr-4 text-xs font-semibold text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/20"
          />
        </div>
      </div>

      {/* Structured Stream Table Workspace (Scrollable) */}
      <div className="flex-1 min-h-0 rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
          </div>
        ) : streams.length > 0 ? (
          <div className="flex-1 overflow-y-auto divide-y divide-zylo-border">
            {streams.map((stream) => (
              <div key={stream.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:bg-zylo-warm/40 transition">
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative h-16 w-28 rounded-xl bg-zylo-warm overflow-hidden border border-zylo-border shrink-0">
                    {stream.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stream.thumbnailUrl} alt={stream.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zylo-muted">
                        <Video className="h-6 w-6" />
                      </div>
                    )}
                    {stream.status === 'LIVE' && (
                      <span className="absolute top-1 left-1 rounded-md bg-[#B8FF3D] px-1.5 py-0.5 text-[9px] font-black text-[#120E21]">
                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zylo-purple">{stream.vibe || 'Just Chatting'}</span>
                      <span className="text-[11px] text-zylo-muted">• {new Date(stream.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 rounded-md bg-zylo-warm px-2 py-0.5 text-[10px] font-bold text-zylo-secondary border border-zylo-border">
                        {stream.visibility === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {stream.visibility || 'PUBLIC'}
                      </span>
                    </div>

                    <h3 className="mt-0.5 text-sm font-extrabold text-zylo-text truncate">{stream.title}</h3>
                    <p className="text-xs text-zylo-muted truncate">{stream.description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {stream.status === 'LIVE' && (
                    <Link
                      href={`/studio/live/${stream.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-zylo-purple px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-xs"
                    >
                      <Radio className="h-3.5 w-3.5 text-[#B8FF3D]" /> Control Room
                    </Link>
                  )}

                  {stream.status === 'ENDED' && stream.allowReplay && (
                    <Link
                      href={`/stream/${stream.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-zylo-warm border border-zylo-border px-3 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
                    >
                      <Play className="h-3.5 w-3.5 text-zylo-purple" /> Watch Replay
                    </Link>
                  )}

                  <button
                    onClick={() => handleTogglePublication(stream)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      stream.publicationStatus === 'HIDDEN'
                        ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                        : 'border-zylo-border bg-white text-zylo-secondary hover:bg-zylo-warm'
                    }`}
                    title="Toggle Publish / Hide status"
                  >
                    {stream.publicationStatus === 'HIDDEN' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => openEditModal(stream)}
                    className="rounded-xl border border-zylo-border bg-white p-2 text-zylo-secondary hover:bg-zylo-warm transition"
                    title="Edit stream details"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(stream.id)}
                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition"
                    title="Delete stream"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-zylo-muted">
            <p className="text-sm font-bold text-zylo-text">No streams found.</p>
            <p className="mt-1 text-xs text-zylo-secondary">Try adjusting your search query or filter settings.</p>
          </div>
        )}

        {/* Server Pagination Bar */}
        <div className="flex items-center justify-between border-t border-zylo-border bg-white px-5 py-3 shrink-0">
          <span className="text-xs font-semibold text-zylo-muted">
            Showing Page {page} of {totalPages} ({totalItems} total streams)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-xl border border-zylo-border p-2 text-zylo-secondary disabled:opacity-30 hover:bg-zylo-warm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="rounded-xl border border-zylo-border p-2 text-zylo-secondary disabled:opacity-30 hover:bg-zylo-warm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Stream Modal */}
      {editingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-extrabold text-zylo-text">Edit Stream Metadata</h2>

            <div>
              <label className="text-xs font-extrabold text-zylo-text mb-1 block">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs outline-none focus:ring-2 focus:ring-zylo-purple/20"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-zylo-text mb-1 block">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:ring-2 focus:ring-zylo-purple/20"
              />
            </div>

            <ThumbnailUploader value={editThumbnail} onChange={setEditThumbnail} />

            <div className="flex gap-3 pt-4 border-t border-zylo-border">
              <button
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="flex-1 rounded-2xl bg-zylo-purple py-3 text-xs font-extrabold text-white hover:bg-[#6926d1] transition disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingStream(null)}
                className="flex-1 rounded-2xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

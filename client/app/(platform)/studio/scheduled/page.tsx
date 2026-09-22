'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Clock,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Stream } from '@/lib/types';
import { streamsApi } from '@/lib/api';

export default function ScheduledStreamsPage() {
  const [scheduledList, setScheduledList] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScheduled() {
      try {
        const res = await streamsApi.getMyStreams({ status: 'SCHEDULED' });
        setScheduledList(res.items);
      } catch (err) {
        console.error('Failed to load scheduled streams:', err);
      } finally {
        setLoading(false);
      }
    }
    loadScheduled();
  }, []);

  const handleCreateScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate || !scheduledTime) {
      setError('Please provide title, date, and time');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scheduledAtIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const res = await streamsApi.createStream({
        title,
        description: description || undefined,
        scheduledAt: scheduledAtIso,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setScheduledDate('');
      setScheduledTime('');

      // Refresh list
      const updated = await streamsApi.getMyStreams({ status: 'SCHEDULED' });
      setScheduledList(updated.items);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule stream');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      await streamsApi.cancelStream(id);
      setScheduledList((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel stream');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-zylo-purple">
              <Calendar className="h-4 w-4" /> Creator Studio
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">
              Scheduled Streams
            </h1>
          </div>
        </div>
        <div className="rounded-3xl border border-zylo-border bg-white shadow-sm overflow-hidden animate-pulse">
          <div className="divide-y divide-zylo-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-5 gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#ECE8F5] shrink-0" />
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-[#ECE8F5]" />
                    <div className="h-4 w-48 rounded bg-[#ECE8F5]" />
                    <div className="h-2.5 w-32 rounded bg-[#ECE8F5]" />
                  </div>
                </div>
                <div className="h-8 w-28 rounded-xl bg-[#ECE8F5]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-zylo-purple">
            <Calendar className="h-4 w-4" /> Creator Studio
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">
            Scheduled Streams
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-md shadow-zylo-purple/20"
        >
          <Plus className="h-4 w-4" /> Schedule New Stream
        </button>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-zylo-border bg-white shadow-sm overflow-hidden">
        {scheduledList.length > 0 ? (
          <div className="divide-y divide-zylo-border">
            {scheduledList.map((stream) => (
              <div key={stream.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-zylo-warm/50 transition">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zylo-soft text-zylo-purple shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-700">
                      SCHEDULED
                    </span>
                    <h3 className="mt-1 text-base font-extrabold text-zylo-text">{stream.title}</h3>
                    <p className="mt-0.5 text-xs text-zylo-secondary">{stream.description || 'No description'}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleCancelScheduled(stream.id)}
                  className="rounded-xl border border-zylo-border px-4 py-2 text-xs font-bold text-zylo-secondary hover:bg-zylo-warm transition self-end sm:self-center"
                >
                  Cancel Schedule
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-zylo-muted">
            <p className="text-sm font-semibold">No upcoming streams scheduled.</p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateScheduled} className="w-full max-w-md rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-zylo-text mb-4">Schedule a Future Stream</h3>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zylo-text">Stream Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy broadcast title..."
                  className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-zylo-purple/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zylo-text">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What will you broadcast?"
                  className="mt-1 w-full rounded-xl border border-zylo-border bg-zylo-warm p-3 text-xs outline-none focus:ring-2 focus:ring-zylo-purple/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zylo-text">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-zylo-purple/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zylo-text">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-zylo-purple/20"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-zylo-purple py-3 text-xs font-extrabold text-white hover:bg-[#6926d1] transition"
              >
                {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Confirm Schedule'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-zylo-border bg-zylo-warm py-3 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

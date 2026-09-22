'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { mediaApi } from '@/lib/api';

interface ThumbnailUploaderProps {
  value?: string;
  onChange: (url: string) => void;
}

export function ThumbnailUploader({ value, onChange }: ThumbnailUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum allowed size is 5MB.');
      return;
    }

    setUploading(true);

    try {
      const res = await mediaApi.uploadFile(file, 'STREAM_THUMBNAIL');
      if (res?.url) {
        onChange(res.url);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-extrabold text-zylo-text">
        Thumbnail Image <span className="text-zylo-muted font-normal">(File upload required)</span>
      </label>

      {value ? (
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-2xl border border-zylo-border bg-zylo-warm shadow-xs group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Stream Thumbnail Preview" className="h-full w-full object-cover" />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-zylo-text hover:bg-white shadow transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-zylo-purple" /> Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow transition"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-video w-full max-w-sm cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zylo-border bg-zylo-warm p-6 text-center transition hover:border-zylo-purple hover:bg-zylo-soft/50"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-zylo-purple">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-bold">Uploading image...</span>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-white p-3 shadow-xs mb-2">
                <Upload className="h-6 w-6 text-zylo-purple" />
              </div>
              <p className="text-xs font-bold text-zylo-text">Click or drag & drop image file</p>
              <p className="mt-1 text-[10px] text-zylo-muted">JPEG, PNG, or WebP (max 5MB)</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-slate-800/60 ${className}`} />;
}

export function TextSkeleton({ className = 'h-4 w-24' }: SkeletonProps) {
  return <Skeleton className={`rounded ${className}`} />;
}

export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };
  return <Skeleton className={`rounded-full ${sizeMap[size]}`} />;
}

export function MetricSkeleton({ className = 'h-7 w-16' }: SkeletonProps) {
  return <Skeleton className={`rounded-lg ${className}`} />;
}

export function StreamCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-900/40 p-3 border border-slate-800/40">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex gap-3 items-center mt-1">
        <AvatarSkeleton size="sm" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-4 border-b border-slate-800/40">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-16 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      <AvatarSkeleton size="sm" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function VideoPlaceholder({ text = 'Loading broadcast player...' }: { text?: string }) {
  return (
    <div className="relative aspect-video w-full rounded-2xl bg-slate-900/90 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center gap-3 p-6">
      <div className="h-12 w-12 rounded-full bg-zylo-purple/20 border border-zylo-purple/30 flex items-center justify-center animate-pulse">
        <div className="h-5 w-5 rounded-full bg-zylo-purple animate-ping" />
      </div>
      <p className="text-xs font-medium text-slate-400 animate-pulse">{text}</p>
    </div>
  );
}

export function GiftCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-3.5 w-16 mt-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function AdminStatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-slate-900/50 p-5 border border-slate-800/60 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

export function AdminTableRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-800/50">
      <div className="flex items-center gap-3">
        <AvatarSkeleton size="sm" />
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-7 w-20 rounded-lg" />
    </div>
  );
}

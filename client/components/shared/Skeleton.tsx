export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zylo-soft ${className}`} />;
}

export function StreamCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="mt-2 h-3 w-3/4" />
      <Skeleton className="mt-1.5 h-2.5 w-1/2" />
    </div>
  );
}

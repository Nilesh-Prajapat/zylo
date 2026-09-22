import Link from 'next/link';

export function Logo({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <Link href="/" className="inline-flex items-center justify-center focus:outline-none">
      <img
        src="/zylo-logo.png"
        alt="Zylo"
        className={`object-contain ${className}`}
      />
    </Link>
  );
}

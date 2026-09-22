'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

import { parseApiError, ApiFieldError } from '@/lib/api/axios-client';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await register({
        email,
        password,
        username,
        displayName: name || username,
      });
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      if (parsed.details) {
        const fe: Record<string, string> = {};
        parsed.details.forEach((d) => {
          if (d.field) fe[d.field] = d.message;
        });
        setFieldErrors(fe);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-zylo-border bg-white shadow-2xl grid md:grid-cols-2">
      {/* Form Side */}
      <div className="p-8 sm:p-10 flex flex-col justify-between">
        <div>
          <Logo className="h-8 w-auto" />
          <p className="mt-1.5 text-xs text-zylo-secondary">
            Join Zylo today and discover live creators and communities.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="my-6 flex flex-col gap-3">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zylo-text">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nilesh"
              className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3.5 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
              required
            />
            {fieldErrors.displayName && <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.displayName}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-zylo-text">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. nilesh"
              className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3.5 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
              required
            />
            {fieldErrors.username && <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.username}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-zylo-text">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3.5 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
              required
            />
            {fieldErrors.email && <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-zylo-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-10 w-full rounded-xl border border-zylo-border bg-zylo-warm px-3.5 text-xs text-zylo-text outline-none focus:ring-2 focus:ring-zylo-purple/30"
              required
            />
            {fieldErrors.password && <p className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zylo-purple py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#6926d1] transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
              </>
            ) : (
              <>
                Create Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-zylo-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-extrabold text-zylo-purple hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      {/* Hero Visual Side */}
      <div className="relative hidden md:block overflow-hidden bg-zylo-text">
        <img
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop"
          alt="Creator background"
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zylo-text via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zylo-lime">
            Join the Community
          </span>
          <h2 className="mt-1 text-2xl font-black leading-tight">
            Connect. Support.<br />
            Be Real.
          </h2>
        </div>
      </div>
    </div>
  );
}

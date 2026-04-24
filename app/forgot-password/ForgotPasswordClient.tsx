'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath) {
    return '/dashboard';
  }
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/dashboard';
  }
  return nextPath;
}

const GENERIC_RESET_FEEDBACK =
  'If this email is registered, a password reset link will be sent shortly.';

export default function ForgotPasswordClient() {
  const params = useSearchParams();
  const toast = useToast();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const nextPath = useMemo(() => sanitizeNextPath(params.get('next')), [params]);
  const backToLoginHref =
    nextPath === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setFeedback('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFeedback('');

    try {
      await requestPasswordReset(trimmedEmail);
    } catch (error) {
      console.error('Forgot password request failed:', error);
    } finally {
      setFeedback(GENERIC_RESET_FEEDBACK);
      toast.success('Request submitted', GENERIC_RESET_FEEDBACK);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen pt-32 pb-20 bg-brand-bg">
      <div className="site-container-readable">
        <div className="max-w-md mx-auto glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-black uppercase text-brand-text">Forgot Password</h1>
        <p className="text-brand-text/45 text-[10px] font-black uppercase tracking-widest mt-2 mb-6">
          Request a secure password reset link
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-primary/50"
              autoComplete="email"
              required
            />
          </div>

          {feedback ? (
            <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs text-brand-text/85">
              {feedback}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] border-b-4 border-secondary disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send Reset Link
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href={backToLoginHref} className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-primary/80">
            Back to Login
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}

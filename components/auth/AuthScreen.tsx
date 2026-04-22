'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import GoogleLogo from '@/components/auth/GoogleLogo';

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath) {
    return '/dashboard';
  }
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/dashboard';
  }
  return nextPath;
}

export default function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { user, loading, login, loginWithEmail, signupWithEmail } = useAuth();

  const nextPath = useMemo(() => sanitizeNextPath(params.get('next')), [params]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, user, nextPath, router]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await signupWithEmail(email.trim(), password, name.trim());
      }
      router.replace(nextPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue right now.';
      setErrorMessage(message);
      toast.error('Authentication failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await login();
      router.replace(nextPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue with Google right now.';
      setErrorMessage(message);
      toast.error('Google sign-in failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = nextPath === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;
  const signupHref = nextPath === '/dashboard' ? '/signup' : `/signup?next=${encodeURIComponent(nextPath)}`;
  const forgotHref = nextPath === '/dashboard' ? '/forgot-password' : `/forgot-password?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 bg-brand-bg">
      <div className="max-w-md mx-auto glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="mb-6 md:mb-7">
          <h1 className="text-3xl md:text-4xl font-black uppercase text-brand-text">
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </h1>
          <p className="text-brand-text/45 text-[10px] font-black uppercase tracking-widest mt-2">
            {mode === 'login' ? 'Access your secure dashboard' : 'Create your secure account'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10 mb-5">
          <Link
            href={loginHref}
            className={`text-center py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              mode === 'login' ? 'bg-primary text-black' : 'text-brand-text/50 hover:text-brand-text'
            }`}
          >
            Login
          </Link>
          <Link
            href={signupHref}
            className={`text-center py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              mode === 'signup' ? 'bg-primary text-black' : 'text-brand-text/50 hover:text-brand-text'
            }`}
          >
            Sign Up
          </Link>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-accent">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'signup' ? (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-primary/50"
                autoComplete="name"
                required
              />
            </div>
          ) : null}

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

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-primary/50"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>

          {mode === 'login' ? (
            <div className="flex justify-end">
              <Link href={forgotHref} className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-primary/80">
                Forgot Password?
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] border-b-4 border-secondary disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {mode === 'login' ? 'Continue' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="h-px bg-white/10" />
          <div className="absolute inset-0 -top-2.5 text-center">
            <span className="px-3 bg-brand-bg text-[9px] text-brand-text/35 uppercase tracking-widest font-black">Or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleGoogleLogin();
          }}
          disabled={submitting}
          className="w-full rounded-xl border border-white/15 bg-white/[0.03] py-3.5 text-[11px] font-black uppercase tracking-widest text-brand-text hover:border-primary/40 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2.5"
        >
          <GoogleLogo className="w-4 h-4" />
          Continue With Google
        </button>
      </div>
    </main>
  );
}


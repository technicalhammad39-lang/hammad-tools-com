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
    <main className="min-h-screen page-navbar-spacing pb-16 md:pb-20 bg-brand-bg">
      <div className="site-container-readable grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
        <section className="hidden lg:flex flex-col justify-between glass rounded-[2.2rem] border border-white/10 p-10 xl:p-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Secure Access</p>
            <h2 className="mt-4 text-5xl font-black uppercase leading-[0.95] text-brand-text">
              Hammad <span className="internal-gradient">Tools</span>
            </h2>
            <p className="mt-5 text-base text-brand-text/70 leading-relaxed max-w-md">
              Login to manage orders, uploads, and premium subscriptions with a faster dashboard workflow.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-brand-text/80">
              Real-time order tracking and chat
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-brand-text/80">
              Secure checkout with verified proof flow
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-brand-text/80">
              Direct access to account history
            </div>
          </div>
        </section>

        <section className="glass rounded-[2rem] md:rounded-[2.4rem] border border-white/10 p-6 md:p-9 lg:p-10">
          <div className="mb-7 md:mb-8">
            <h1 className="text-4xl md:text-5xl font-black uppercase text-brand-text leading-none">
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </h1>
            <p className="text-brand-text/50 text-xs md:text-sm font-black uppercase tracking-[0.18em] mt-3">
              {mode === 'login' ? 'Access your secure dashboard' : 'Create your secure account'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <Link
              href={loginHref}
              className={`text-center py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] ${
                mode === 'login' ? 'bg-primary text-black' : 'text-brand-text/55 hover:text-brand-text'
              }`}
            >
              Login
            </Link>
            <Link
              href={signupHref}
              className={`text-center py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] ${
                mode === 'signup' ? 'bg-primary text-black' : 'text-brand-text/55 hover:text-brand-text'
              }`}
            >
              Sign Up
            </Link>
          </div>

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' ? (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary/50"
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/30" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary/50"
                autoComplete="email"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/30" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary/50"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {mode === 'login' ? (
              <div className="flex justify-end">
                <Link
                  href={forgotHref}
                  className="text-[11px] uppercase font-black tracking-[0.15em] text-primary hover:text-primary/80"
                >
                  Forgot Password?
                </Link>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-black py-4 md:py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] border-b-4 border-secondary disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {mode === 'login' ? 'Continue' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="h-px bg-white/10" />
            <div className="absolute inset-0 -top-2.5 text-center">
              <span className="px-3 bg-brand-bg text-[10px] text-brand-text/35 uppercase tracking-[0.2em] font-black">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleGoogleLogin();
            }}
            disabled={submitting}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.03] py-4 md:py-5 text-[12px] font-black uppercase tracking-[0.18em] text-brand-text hover:border-primary/40 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2.5"
          >
            <GoogleLogo className="w-5 h-5" />
            Continue With Google
          </button>
        </section>
      </div>
    </main>
  );
}

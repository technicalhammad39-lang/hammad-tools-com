import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ForgotPasswordClient from './ForgotPasswordClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Reset Password',
  description: 'Request a password reset link for your Hammad Tools account.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-32 pb-20 px-4 bg-brand-bg">
          <div className="max-w-md mx-auto py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
      }
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}


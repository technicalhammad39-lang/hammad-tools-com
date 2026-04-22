import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuthScreen from '@/components/auth/AuthScreen';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Sign Up',
  description: 'Create your Hammad Tools account to purchase and manage subscriptions securely.',
  path: '/signup',
  noIndex: true,
});

export default function SignupPage() {
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
      <AuthScreen mode="signup" />
    </Suspense>
  );
}

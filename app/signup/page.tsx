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
        <main className="min-h-screen page-navbar-spacing pb-20 bg-brand-bg">
          <div className="site-container-readable py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
      }
    >
      <AuthScreen mode="signup" />
    </Suspense>
  );
}

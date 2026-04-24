import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuthScreen from '@/components/auth/AuthScreen';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Login',
  description: 'Login to your Hammad Tools account for secure checkout and dashboard access.',
  path: '/login',
  noIndex: true,
});

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-32 pb-20 bg-brand-bg">
          <div className="site-container-readable py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
      }
    >
      <AuthScreen mode="login" />
    </Suspense>
  );
}

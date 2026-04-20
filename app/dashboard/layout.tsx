import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'User Dashboard',
  description: 'Manage your Hammad Tools orders, messages and notifications securely.',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}


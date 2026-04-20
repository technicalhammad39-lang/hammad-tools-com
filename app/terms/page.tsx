import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of Service - Hammad Tools',
  description: 'Read Hammad Tools terms of service for subscription usage, account policies, and payment terms.',
  path: '/terms',
  keywords: ['hammad tools terms', 'subscription terms Pakistan'],
});

export default function TermsPage() {
  return <TermsPageClient />;
}


import type { Metadata } from 'next';
import PrivacyPageClient from './PrivacyPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy Policy - Hammad Tools',
  description: 'Read Hammad Tools privacy policy to understand how we collect, use, and protect your data.',
  path: '/privacy',
  keywords: ['hammad tools privacy policy', 'privacy policy subscriptions'],
});

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}


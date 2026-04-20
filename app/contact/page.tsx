import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Contact Hammad Tools',
  description:
    'Contact Hammad Tools for support, order help, and paid service inquiries. Reach out for quick response through WhatsApp and social channels.',
  path: '/contact',
  keywords: ['contact hammad tools', 'hammad tools support', 'subscription support Pakistan'],
});

export default function ContactPage() {
  return <ContactPageClient />;
}


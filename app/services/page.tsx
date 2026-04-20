import type { Metadata } from 'next';
import ServicesPageClient from './ServicesPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Agency Services - Paid Services by Hammad',
  description:
    'Request premium agency services from Hammad Tools with secure payment proof, quick response, and trusted delivery for Pakistani users.',
  path: '/services',
  keywords: ['paid services by hammad', 'agency services Pakistan', 'digital services Pakistan'],
});

export default function ServicesPage() {
  return <ServicesPageClient />;
}


import type { Metadata } from 'next';
import ServicesPageClient from './ServicesPageClient';
import { createAutoPageMetadata } from '@/lib/seo';
import { getPublishedAgencyServices } from '@/lib/server/agency-services';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const services = await getPublishedAgencyServices();
  const featured = services[0];

  return createAutoPageMetadata({
    title: 'Agency Services - Paid Services by Hammad',
    path: '/services',
    image: featured?.thumbnail || '/services-card.webp',
    shortDescription: featured?.description,
    fallbackDescription:
      'Request premium agency services from Hammad Tools with secure payment proof, quick response, and trusted delivery for Pakistani users.',
    keywords: ['paid services by hammad', 'agency services Pakistan', 'digital services Pakistan'],
  });
}

export default function ServicesPage() {
  return <ServicesPageClient />;
}

import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { CORE_KEYWORDS, TOOL_KEYWORDS, createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Hammad Tools - Cheap Premium Subscriptions in Pakistan',
  description:
    'Buy cheap premium subscriptions in Pakistan from Hammad Tools. Get Canva Pro, ChatGPT Plus, Netflix and more with fast delivery and secure checkout.',
  path: '/',
  keywords: [...CORE_KEYWORDS, ...TOOL_KEYWORDS, 'premium subscriptions', 'paid services by hammad'],
});

export default function HomePage() {
  return <HomePageClient />;
}


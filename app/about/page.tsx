import { Metadata } from 'next';
import AboutClient from './AboutClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'About Us - Hammad Tools',
  description:
    'Learn about the vision behind Hammad Tools, our CEO message, and how we deliver cheap premium subscriptions in Pakistan.',
  path: '/about',
  keywords: ['about hammad tools', 'paid services by hammad', 'premium subscriptions Pakistan'],
});

export default function AboutPage() {
  return <AboutClient />;
}

import React from 'react';
import { Metadata } from 'next';
import GiveawayPage from './GiveawayPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Exclusive Giveaways - Hammad Tools',
  description:
    'Join Hammad Tools giveaways to win premium subscriptions, software tools and exclusive digital rewards.',
  path: '/giveaway',
  keywords: ['hammad tools giveaway', 'win premium subscriptions Pakistan', 'free canva pro giveaway'],
});

export default function Page() {
  return <GiveawayPage />;
}

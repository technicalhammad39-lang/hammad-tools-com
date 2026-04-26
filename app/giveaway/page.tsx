import React from 'react';
import { Metadata } from 'next';
import GiveawayPage from './GiveawayPageClient';
import { createAutoPageMetadata } from '@/lib/seo';
import { resolveImageSource } from '@/lib/image-display';
import { adminDb } from '@/lib/server/firebase-admin';

type GiveawayDocument = {
  title?: string;
  description?: string;
  image?: string;
  imageMedia?: unknown;
  status?: string;
};

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  let featured: GiveawayDocument | null = null;

  try {
    const snapshot = await adminDb.collection('giveaways').orderBy('createdAt', 'desc').limit(8).get();
    const all = snapshot.docs.map((doc) => doc.data() as GiveawayDocument);
    featured = all.find((entry) => (entry.status || '').toLowerCase() === 'active') || all[0] || null;
  } catch {
    featured = null;
  }

  const image = featured
    ? resolveImageSource(featured, {
        mediaPaths: ['imageMedia'],
        stringPaths: ['image'],
        placeholder: '/services-card.webp',
      })
    : '/services-card.webp';

  return createAutoPageMetadata({
    title: featured?.title
      ? `${featured.title} Giveaway | Hammad Tools`
      : 'Exclusive Giveaways - Hammad Tools',
    path: '/giveaway',
    image,
    shortDescription: featured?.description,
    fallbackDescription:
      'Join Hammad Tools giveaways to win premium subscriptions, software tools and exclusive digital rewards.',
    keywords: ['hammad tools giveaway', 'win premium subscriptions Pakistan', 'free canva pro giveaway'],
  });
}

export default function Page() {
  return <GiveawayPage />;
}

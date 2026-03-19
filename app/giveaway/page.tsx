import React from 'react';
import { Metadata } from 'next';
import GiveawayPage from './GiveawayPageClient';

export const metadata: Metadata = {
  title: 'Exclusive Giveaways',
  description: 'Enter our mega giveaways and win premium subscriptions, tools, and software for free. Join the Hammad Tools community rewards protocol.',
  openGraph: {
    title: 'Hammad Tools Giveaways',
    description: 'Win premium digital rewards today.',
  }
};

export default function Page() {
  return <GiveawayPage />;
}

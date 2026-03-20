import { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About Us | Hammad Tools',
  description: 'Learn about the vision behind Hammad Tools, our dedicated CEO message, and how we are revolutionizing digital access world-wide.',
  openGraph: {
    title: 'About Hammad Tools - Our Vision & Mission',
    description: 'Discover the team and technology powering the ultimate digital tool access platform.',
    images: ['/logo-header.png'],
  }
};

export default function AboutPage() {
  return <AboutClient />;
}

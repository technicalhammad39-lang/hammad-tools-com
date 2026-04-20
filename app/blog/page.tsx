import type { Metadata } from 'next';
import BlogPageClient from './BlogPageClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Blog - Premium Tools Guides & Subscription Tips',
  description:
    'Read Hammad Tools blog for premium tools guides, cheap subscription tips, and updates about Canva Pro, ChatGPT Plus, and digital services.',
  path: '/blog',
  keywords: ['hammad tools blog', 'subscription tips Pakistan', 'canva pro tips', 'chatgpt plus tips'],
});

export default function BlogPage() {
  return <BlogPageClient />;
}


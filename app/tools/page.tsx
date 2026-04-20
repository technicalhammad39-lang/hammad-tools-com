import type { Metadata } from 'next';
import ToolsPageClient from './ToolsPageClient';
import { TOOL_KEYWORDS, createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Tools Catalog - Cheap Canva Pro, ChatGPT Plus, Netflix Pakistan',
  description:
    'Explore Hammad Tools catalog for cheap Canva Pro, ChatGPT Plus, Netflix Pakistan and other premium subscription tools with instant delivery.',
  path: '/tools',
  keywords: [...TOOL_KEYWORDS, 'tools catalog Pakistan', 'cheap subscriptions list'],
});

export default function ToolsPage() {
  return <ToolsPageClient />;
}


import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays } from 'lucide-react';
import {
  formatBlogPublishDate,
  type BlogPostDocument,
} from '@/lib/blog';
import { toSeoPlainText } from '@/lib/seo';
import { resolveImageSource } from '@/lib/image-display';

type BlogCardProps = {
  post: BlogPostDocument;
  compact?: boolean;
};

export default function BlogCard({ post, compact = false }: BlogCardProps) {
  const coverImageUrl = resolveImageSource(post, {
    mediaPaths: ['coverImageMedia', 'thumbnailMedia', 'imageMedia'],
    stringPaths: ['coverImageUrl', 'thumbnail', 'imageUrl', 'image'],
    placeholder: '/services-card.webp',
  });
  const publishDate = formatBlogPublishDate(post.publishedAt || post.createdAt);
  const categoryLabel = post.category || 'Insight';
  const shortDescription = toSeoPlainText(post.shortDescription || '').trim();

  return (
    <article className="group h-full overflow-hidden rounded-[1.55rem] border border-white/10 bg-gradient-to-b from-[#1A1A1A] via-[#151515] to-[#101010] shadow-[0_18px_45px_rgba(0,0,0,0.45)] hover:border-primary/35 transition-colors">
      <Link href={`/blogs/${post.slug}`} className="block" aria-label={`Read ${post.title}`}>
        <div className={`relative overflow-hidden border-b border-white/10 ${compact ? 'h-48 sm:h-52' : 'h-52 sm:h-56 md:h-60'}`}>
          <Image
            src={coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            unoptimized={coverImageUrl.startsWith('http')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-primary/35 bg-black/70 px-3 py-1 text-[10px] font-bold tracking-[0.01em] text-primary backdrop-blur-md">
            {categoryLabel}
          </span>
        </div>
      </Link>

      <div className="p-5 md:p-6 flex h-[calc(100%-13rem)] sm:h-[calc(100%-14rem)] md:h-[calc(100%-15rem)] flex-col">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-brand-text/55 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-brand-text/45" />
            {publishDate}
          </span>
        </div>

        <h2 className="mt-4 text-[30px] leading-tight text-brand-text line-clamp-3 min-h-[4.2rem] md:text-[31px] font-[850] tracking-[-0.015em]">
          <Link href={`/blogs/${post.slug}`} className="group-hover:text-primary transition-colors">
            {post.title}
          </Link>
        </h2>

        <p className="mt-3 text-[17px] leading-relaxed text-brand-text/68 line-clamp-3 min-h-[4.5rem]">
          {shortDescription}
        </p>

        <div className="mt-auto pt-5">
          <Link
            href={`/blogs/${post.slug}`}
            className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[0.005em] text-primary hover:text-primary/80 transition-colors"
          >
            Read more
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

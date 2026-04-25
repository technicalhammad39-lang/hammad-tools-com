import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import {
  formatBlogPublishDate,
  formatBlogReadTime,
  getBlogReadTimeMinutes,
  type BlogPostDocument,
} from '@/lib/blog';

type BlogCardProps = {
  post: BlogPostDocument;
  compact?: boolean;
};

export default function BlogCard({ post, compact = false }: BlogCardProps) {
  const coverImageUrl = post.coverImageUrl || '/services-card.webp';
  const publishDate = formatBlogPublishDate(post.publishedAt || post.createdAt);
  const readTimeLabel = formatBlogReadTime(getBlogReadTimeMinutes(post.content));
  const categoryLabel = post.category || 'Insight';

  return (
    <article className="group h-full overflow-hidden rounded-[1.6rem] md:rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#171717] to-[#101010] shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-primary/35 transition-colors">
      <Link href={`/blogs/${post.slug}`} className="block" aria-label={`Read ${post.title}`}>
        <div className={`relative overflow-hidden ${compact ? 'h-48 sm:h-52' : 'h-52 sm:h-56 md:h-60'}`}>
          <Image
            src={coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            unoptimized={coverImageUrl.startsWith('http')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/90 backdrop-blur-md">
            {categoryLabel}
          </span>
        </div>
      </Link>

      <div className="p-5 md:p-6 flex h-[calc(100%-13rem)] sm:h-[calc(100%-14rem)] md:h-[calc(100%-15rem)] flex-col">
        <div className="flex items-center gap-3 text-[11px] text-brand-text/45 uppercase tracking-[0.08em] font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {publishDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-primary/90" />
            {readTimeLabel}
          </span>
        </div>

        <h2 className="mt-3 text-xl md:text-[22px] font-black leading-snug text-brand-text line-clamp-3 min-h-[4.3rem]">
          <Link href={`/blogs/${post.slug}`} className="group-hover:text-primary transition-colors">
            {post.title}
          </Link>
        </h2>

        <p className="mt-2 text-[14px] leading-relaxed text-brand-text/60 line-clamp-2 min-h-[2.7rem]">
          {post.shortDescription}
        </p>

        <div className="mt-auto pt-4">
          <Link
            href={`/blogs/${post.slug}`}
            className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-primary hover:text-primary/80 transition-colors"
          >
            Read More
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

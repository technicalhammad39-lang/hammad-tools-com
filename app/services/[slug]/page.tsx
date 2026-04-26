import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Tag } from 'lucide-react';
import UploadedImage from '@/components/UploadedImage';
import {
  buildSeoDescription,
  createAutoPageMetadata,
  createPageMetadata,
  toAbsoluteSiteUrl,
} from '@/lib/seo';
import { toMetadataImageUrl } from '@/lib/image-display';
import { getAgencyServiceBySlug } from '@/lib/server/agency-services';

type PageParams = { slug: string };

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getAgencyServiceBySlug(slug);

  if (!service) {
    return createPageMetadata({
      title: 'Service Not Found',
      description: 'The requested service could not be found.',
      path: `/services/${slug}`,
      noIndex: true,
    });
  }

  const metadataImage = toMetadataImageUrl(service.thumbnail) || '/services-card.webp';
  return createAutoPageMetadata({
    title: `${service.title} | Hammad Tools Services`,
    path: `/services/${service.slug}`,
    image: metadataImage,
    shortDescription: service.description,
    fallbackDescription: `${service.title} service by Hammad Tools with fast delivery and professional support in Pakistan.`,
    keywords: [
      'hammad tools services',
      service.title,
      `${service.title} Pakistan`,
      ...service.tags,
    ],
  });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const service = await getAgencyServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const imageSrc = service.thumbnail || '/services-card.webp';
  const serviceUrl = toAbsoluteSiteUrl(`/services/${service.slug}`);
  const serviceImage = imageSrc.startsWith('http')
    ? imageSrc
    : toAbsoluteSiteUrl(imageSrc);
  const serviceDescription = buildSeoDescription(
    [service.description],
    `${service.title} service by Hammad Tools.`,
    200
  );

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    serviceType: service.title,
    description: serviceDescription,
    image: [serviceImage],
    provider: {
      '@type': 'Organization',
      name: 'Hammad Tools',
      url: toAbsoluteSiteUrl('/'),
    },
    areaServed: 'PK',
    url: serviceUrl,
  };

  return (
    <main className="min-h-screen page-navbar-spacing pb-16 md:pb-24 bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <div className="site-container max-w-5xl">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-text/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back To Services
        </Link>

        <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/25 overflow-hidden">
          <div className="w-full overflow-hidden">
            <UploadedImage
              src={imageSrc}
              fallbackSrc="/services-card.webp"
              alt={service.title}
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-black text-brand-text leading-tight">
              {service.title}
            </h1>

            {service.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-text/70"
                  >
                    <Tag className="w-3 h-3 text-primary" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-6 text-base md:text-lg leading-8 text-brand-text/80 whitespace-pre-wrap">
              {service.description || 'Contact Hammad Tools for service details and custom quote.'}
            </p>

            <div className="mt-8">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Request On Services Page
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

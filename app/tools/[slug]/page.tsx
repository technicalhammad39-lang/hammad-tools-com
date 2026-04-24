import type { Metadata } from 'next';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import ServiceDetailClient from './ServiceDetailClient';
import { resolveImageSource, toMetadataImageUrl } from '@/lib/image-display';
import type { StoredFileMetadata } from '@/lib/types/domain';
import { TOOL_KEYWORDS, createPageMetadata, toAbsoluteSiteUrl } from '@/lib/seo';

interface Plan {
  planName: string;
  ourPrice: number;
  officialPrice: number;
  benefits: string[];
  salePrice?: number;
  price?: number;
}

interface Service {
  id: string;
  title?: string;
  name: string;
  slug?: string;
  description: string;
  longDescription?: string;
  price: number;
  image: string;
  thumbnail?: string;
  imageMedia?: StoredFileMetadata | null;
  category: string;
  features?: string[];
  plans?: Plan[];
}

interface ReviewRecord {
  id: string;
  userName?: string;
  text?: string;
  rating?: number;
  createdAt?: any;
}

function toPrice(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getPlanPrice(plan: Plan | undefined) {
  if (!plan) return 0;
  return toPrice(plan.ourPrice ?? plan.salePrice ?? plan.price);
}

function getPlanLabel(service: Service) {
  const plans = Array.isArray(service.plans) ? service.plans : [];
  const preferred = plans[0];
  const label = (preferred?.planName || '').trim();
  return label || 'Standard Plan';
}

function getMinPrice(service: Service) {
  const plans = Array.isArray(service.plans) ? service.plans : [];
  if (!plans.length) {
    return toPrice(service.price);
  }
  const prices = plans.map(getPlanPrice).filter((value) => value > 0);
  if (!prices.length) {
    return toPrice(service.price);
  }
  return Math.min(...prices);
}

function getServiceSlug(service: Service) {
  return (service.slug || service.name || '').toString().toLowerCase().trim().replace(/\s+/g, '-');
}

function getSeoDescription(service: Service, planLabel: string, minPrice: number) {
  const baseDescription =
    (service.longDescription || service.description || '').trim() ||
    `${service.name} premium subscription with secure checkout and fast delivery in Pakistan.`;
  const priceText = minPrice > 0 ? ` starting from Rs ${minPrice}` : '';
  return `${service.name} ${planLabel}${priceText}. ${baseDescription} Buy cheap premium subscriptions in Pakistan from Hammad Tools.`;
}

async function getService(slug: string): Promise<Service | null> {
  try {
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef, where('slug', '==', slug));
    const querySnapshot = await getDocs(q);

    const docSnap = querySnapshot.docs[0];
    if (docSnap) {
      const data = docSnap.data();
      const serviceTitle = (data.title || data.name || '').toString();
      const serviceSlug = (data.slug || serviceTitle.toLowerCase().replace(/ /g, '-')).toString();

      if ((data.type || 'tools') !== 'tools' || data.active === false) {
        return null;
      }

      return {
        id: docSnap.id,
        ...data,
        name: data.name || serviceTitle,
        slug: serviceSlug,
      } as Service;
    }

    const fallbackSnapshot = await getDocs(servicesRef);
    let foundService: Service | null = null;
    fallbackSnapshot.forEach((doc) => {
      const data = doc.data();
      const serviceTitle = (data.title || data.name || '').toString();
      const derivedSlug = serviceTitle.toLowerCase().replace(/ /g, '-');
      if (derivedSlug === slug && (data.type || 'tools') === 'tools' && data.active !== false) {
        foundService = {
          id: doc.id,
          ...data,
          name: data.name || serviceTitle,
          slug: derivedSlug,
        } as Service;
      }
    });

    return foundService;
  } catch (error) {
    console.error('Error fetching service:', error);
    return null;
  }
}

async function getToolReviews(service: Service): Promise<ReviewRecord[]> {
  try {
    const serviceSlug = getServiceSlug(service);
    if (!serviceSlug) {
      return [];
    }
    const reviewsQuery = query(
      collection(db, 'service_reviews'),
      where('serviceSlug', '==', serviceSlug),
      limit(20)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    return reviewsSnapshot.docs.map((entry) => ({
      id: entry.id,
      ...(entry.data() as Omit<ReviewRecord, 'id'>),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) {
    return createPageMetadata({
      title: 'Tool Not Found',
      description: 'The requested tool could not be found on Hammad Tools.',
      path: `/tools/${slug}`,
    });
  }

  const planLabel = getPlanLabel(service);
  const minPrice = getMinPrice(service);
  const imageSrc = resolveImageSource(service, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['thumbnail', 'image'],
  });
  const metadataImage = toMetadataImageUrl(imageSrc) || '/services-card.webp';
  const description = getSeoDescription(service, planLabel, minPrice);
  const title = `${service.name} ${planLabel} - Rs ${minPrice || service.price} | Cheap ${service.name} Pakistan`;

  return createPageMetadata({
    title,
    description,
    path: `/tools/${getServiceSlug(service) || slug}`,
    image: metadataImage,
    keywords: [
      ...TOOL_KEYWORDS,
      service.name,
      `${service.name} Pakistan`,
      `${service.name} cheap`,
      `${service.name} subscription`,
      `${service.name} ${planLabel}`,
      'cheap subscriptions Pakistan',
      'paid services by hammad',
    ],
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) {
    return <ServiceDetailClient service={service} loading={false} />;
  }

  const reviews = await getToolReviews(service);
  const validRatings = reviews.map((review) => Number(review.rating || 0)).filter((value) => value >= 1 && value <= 5);
  const ratingValue = validRatings.length
    ? Number((validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length).toFixed(1))
    : 0;
  const reviewCount = validRatings.length;
  const imageSrc = resolveImageSource(service, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['thumbnail', 'image'],
    placeholder: '/services-card.webp',
  });
  const minPrice = getMinPrice(service);
  const absoluteToolUrl = toAbsoluteSiteUrl(`/tools/${getServiceSlug(service) || slug}`);
  const absoluteImage = imageSrc.startsWith('http') ? imageSrc : toAbsoluteSiteUrl(imageSrc);

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: service.name,
    description: service.longDescription || service.description,
    image: [absoluteImage],
    brand: {
      '@type': 'Brand',
      name: 'Hammad Tools',
    },
    category: service.category || 'Digital Subscription',
    url: absoluteToolUrl,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: minPrice || toPrice(service.price),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Hammad Tools',
      },
      url: absoluteToolUrl,
    },
  };

  if (reviewCount > 0 && ratingValue > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };

    productSchema.review = reviews.slice(0, 5).map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.userName || 'Verified Buyer',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(review.rating || 0),
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.text || '',
    }));
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ServiceDetailClient service={service} loading={false} />
    </>
  );
}

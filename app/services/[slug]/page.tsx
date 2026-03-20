import React from 'react';
import { Metadata } from 'next';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import ServiceDetailClient from './ServiceDetailClient';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  features?: string[];
  longDescription?: string;
}

async function getService(slug: string): Promise<Service | null> {
  try {
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef);
    const querySnapshot = await getDocs(q);

    let foundService = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const serviceSlug = data.name.toLowerCase().replace(/ /g, '-');
      if (serviceSlug === slug) {
        foundService = { id: doc.id, ...data } as Service;
      }
    });

    if (foundService) return foundService;

    // Mock for netflix
    if (slug === 'netflix-premium') {
      return {
        id: 'mock-1',
        name: 'Netflix Premium',
        description: 'Ultra HD streaming on 4 screens simultaneously. Global access.',
        price: 500,
        image: 'https://picsum.photos/seed/netflix/800/600',
        category: 'Streaming',
        features: ['4K Ultra HD', '4 Screens at once', 'Offline downloads', 'No Ads'],
        longDescription: 'Experience Netflix like never before with our premium plan. Enjoy unlimited movies, TV shows, and mobile games on four supported devices at a time in Ultra HD.'
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching service:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) {
    return {
      title: 'Service Not Found',
      description: 'The requested service could not be found.'
    };
  }

  return {
    title: service.name,
    description: service.description,
    openGraph: {
      title: service.name,
      description: service.description,
      images: [service.image],
    }
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);

  return <ServiceDetailClient service={service} loading={false} />;
}

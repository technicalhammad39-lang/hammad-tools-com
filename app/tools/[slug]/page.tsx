import React from 'react';
import { Metadata } from 'next';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import ServiceDetailClient from './ServiceDetailClient';

interface Service {
  id: string;
  title?: string;
  name: string;
  slug?: string;
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


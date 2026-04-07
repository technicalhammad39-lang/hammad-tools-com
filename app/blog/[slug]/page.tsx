import React from 'react';
import { Metadata } from 'next';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import BlogDetailClient from './BlogDetailClient';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  thumbnail: string;
  author: string;
  createdAt: any;
  category: string;
  tags: string[];
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    // Some browsers or Next.js versions might provide the slug already decoded or partially encoded.
    // We'll normalize it to ensure we match the 'strict slug' in the database.
    const normalizedSlug = decodeURIComponent(slug).toLowerCase().trim();
    
    console.log('Fetching post for slug:', normalizedSlug);

    const q = query(
      collection(db, 'blogPosts'),
      where('slug', '==', normalizedSlug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BlogPost;
    }
    
    // Fallback: Check if the slug was saved RAW without strictness (legacy support)
    const rawQ = query(
      collection(db, 'blogPosts'),
      where('slug', '==', slug),
      limit(1)
    );
    const rawSnapshot = await getDocs(rawQ);
    if (!rawSnapshot.empty) {
        const doc = rawSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BlogPost;
    }

    return null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.'
    };
  }

  return {
    title: post.title,
    description: post.content.substring(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.substring(0, 160),
      images: [post.thumbnail],
    }
  };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return <BlogDetailClient post={post} loading={false} />;
}

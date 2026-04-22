import type { Metadata } from 'next';
import { Plus_Jakarta_Sans as BrandFont, Oswald } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SettingsProvider } from '@/context/SettingsContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import CartDrawer from '@/components/CartDrawer';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ToastProvider } from '@/components/ToastProvider';
import UserOrderTicker from '@/components/UserOrderTicker';
import LenisProvider from '@/components/LenisProvider';
import ChunkLoadRecovery from '@/components/ChunkLoadRecovery';
import GsapSectionAnimator from '@/components/GsapSectionAnimator';
import { CORE_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, createPageMetadata, getSiteUrl } from '@/lib/seo';

const brandFont = BrandFont({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] });
const displayFont = Oswald({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...createPageMetadata({
    title: `${SITE_NAME} | Premium Subscription & Software Marketplace`,
    description: SITE_DESCRIPTION,
    path: '/',
    keywords: CORE_KEYWORDS,
  }),
  title: {
    default: `${SITE_NAME} | Premium Subscription & Software Marketplace`,
    template: `%s | ${SITE_NAME}`,
  },
  metadataBase: new URL(siteUrl),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo-header.png`,
    sameAs: [],
    description: SITE_DESCRIPTION,
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/tools?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className="dark">
      <body className={`${brandFont.className} ${displayFont.variable} bg-brand-bg text-brand-text min-h-screen flex flex-col relative`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <AnimatedBackground />
        <ErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <SettingsProvider>
                <ToastProvider>
                  <LenisProvider />
                  <GsapSectionAnimator />
                  <ChunkLoadRecovery />
                  <Navbar />
                  <UserOrderTicker />
                  <CartDrawer />
                  <main className="flex-grow">
                    {children}
                  </main>
                  <Footer />
                </ToastProvider>
              </SettingsProvider>
            </CartProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}


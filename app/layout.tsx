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

const brandFont = BrandFont({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] });
const displayFont = Oswald({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

export const metadata: Metadata = {
  title: {
    default: 'Hammad Tools | Premium Subscription & Software Marketplace',
    template: '%s | Hammad Tools'
  },
  description: 'Access premium digital subscriptions, tools, and pro courses at unbeatable prices. Fast, secure, and reliable service from Hammad Tools.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${brandFont.className} ${displayFont.variable} bg-brand-bg text-brand-text min-h-screen flex flex-col relative`}>
        <AnimatedBackground />
        <ErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <SettingsProvider>
                <Navbar />
                <CartDrawer />
                <main className="flex-grow">
                  {children}
                </main>
                <Footer />
              </SettingsProvider>
            </CartProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

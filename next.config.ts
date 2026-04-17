import type {NextConfig} from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
let appPattern:
  | {
      protocol: 'http' | 'https';
      hostname: string;
      port: string;
      pathname: string;
    }
  | null = null;

if (appUrl) {
  try {
    const parsed = new URL(appUrl);
    appPattern = {
      protocol: (parsed.protocol.replace(':', '') as 'http' | 'https') || 'https',
      hostname: parsed.hostname,
      port: parsed.port || '',
      pathname: '/**',
    };
  } catch {
    appPattern = null;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      ...(appPattern ? [appPattern] : []),
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;

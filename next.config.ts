// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Keep your existing image domains
    domains: ['insxojntdqprhhojpuct.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  // Skip ESLint during build (keep this if you want)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // CORRECTED experimental section
  experimental: {
    // This key is correct IF you need experimental features.
    // If you only needed serverExternalPackages, move it outside experimental.
  },
  // MOVED the setting outside experimental as per Next.js changes
  serverExternalPackages: ['@supabase/auth-helpers-nextjs'],
};

module.exports = nextConfig;
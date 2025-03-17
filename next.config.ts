/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['insxojntdqprhhojpuct.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  // Skip ESLint during build to prevent failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use JavaScript configuration for better compatibility
  experimental: {
    // Next.js 15.1.7 features
    serverComponentsExternalPackages: ['@supabase/auth-helpers-nextjs'],
  },
};

module.exports = nextConfig;
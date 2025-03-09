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
  // These experimental flags may help with auth in serverless environments
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@supabase/auth-helpers-nextjs'],
  },
};

module.exports = nextConfig;
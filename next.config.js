/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Remove or keep experimental features based on what you need
  experimental: {
    turbo: {}, // Keep if you want Turbopack
    // reactCompiler: true, // Comment out if causing issues
  },
  
  // Optional: Add these for better error handling
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

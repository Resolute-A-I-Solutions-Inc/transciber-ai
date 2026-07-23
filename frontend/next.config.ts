import type { NextConfig } from 'next'

const FASTAPI = process.env.FASTAPI_URL || 'http://localhost:8000'

const nextConfig: NextConfig = {
  output: 'standalone',
  rewrites: async () => {
    // Only add rewrites if FASTAPI_URL is configured (production)
    // In development, Vite/Next.js dev server handles API routes directly
    if (process.env.FASTAPI_URL) {
      return [
        {
          source: '/api/transcribe',
          destination: `${FASTAPI}/api/transcribe`,
        },
        {
          source: '/api/transcribe/:path*',
          destination: `${FASTAPI}/api/transcribe/:path*`,
        },
        {
          source: '/api/jobs/:path*',
          destination: `${FASTAPI}/api/jobs/:path*`,
        },
        {
          source: '/api/media/:path*',
          destination: `${FASTAPI}/api/media/:path*`,
        },
      ]
    }
    return []
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  rewrites: async () => [
    {
      source: '/api/transcribe',
      destination: 'http://localhost:8000/api/transcribe',
    },
    {
      source: '/api/transcribe/:path*',
      destination: 'http://localhost:8000/api/transcribe/:path*',
    },
    {
      source: '/api/jobs/:path*',
      destination: 'http://localhost:8000/api/jobs/:path*',
    },
    {
      source: '/api/media/:path*',
      destination: 'http://localhost:8000/api/media/:path*',
    },
  ],
}

export default nextConfig

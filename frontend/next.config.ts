import type { NextConfig } from 'next'

// The heavy transcription endpoints (/api/transcribe, /api/jobs, /api/media) are
// called directly from the browser against NEXT_PUBLIC_FASTAPI_URL (see src/api.ts),
// so no proxy rewrites are needed here — that also avoids Vercel's ~4.5MB request
// body limit on proxied functions. /api/languages, /api/transcriptions and
// /api/admin are handled by Next.js route handlers.
const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig

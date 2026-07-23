import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

function requireAdmin(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) return false
  return request.headers.get('x-admin-key') === adminKey
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const rows = await prisma.transcription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        createdAt: true,
        sourceType: true,
        sourceName: true,
        sourceUrl: true,
        engine: true,
        language: true,
        status: true,
        languageDetected: true,
        contentType: true,
        duration: true,
        segments: true,
      },
    })

    const results = rows.map((r) => ({
      id: r.id,
      created_at: r.createdAt.toISOString(),
      source_type: r.sourceType,
      source_name: r.sourceName,
      source_url: r.sourceUrl,
      engine: r.engine,
      language: r.language,
      status: r.status,
      language_detected: r.languageDetected,
      content_type: r.contentType,
      duration: r.duration,
      has_transcript: r.segments !== null,
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}

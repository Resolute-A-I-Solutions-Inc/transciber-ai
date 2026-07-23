import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rows = await prisma.transcription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        sourceType: true,
        sourceName: true,
        engine: true,
        status: true,
        languageDetected: true,
        fullText: true,
        contentType: true,
      },
    })

    const results = rows.map((r) => ({
      id: r.id,
      created_at: r.createdAt.toISOString(),
      source_type: r.sourceType,
      source_name: r.sourceName,
      engine: r.engine,
      status: r.status,
      language_detected: r.languageDetected,
      content_type: r.contentType,
      preview: (r.fullText || '').slice(0, 200),
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}

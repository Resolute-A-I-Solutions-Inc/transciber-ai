import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const row = await prisma.transcription.findUnique({
      where: { id },
    })

    if (!row) {
      return NextResponse.json({ detail: 'Transcription not found.' }, { status: 404 })
    }

    return NextResponse.json({
      id: row.id,
      created_at: row.createdAt.toISOString(),
      source_type: row.sourceType,
      source_name: row.sourceName,
      source_url: row.sourceUrl,
      engine: row.engine,
      language: row.language,
      status: row.status,
      language_detected: row.languageDetected,
      full_text: row.fullText,
      segments: row.segments,
      srt: row.srt,
      vtt: row.vtt,
      error: row.error,
      media_path: row.mediaPath,
      content_type: row.contentType,
      duration: row.duration,
    })
  } catch {
    return NextResponse.json({ detail: 'Transcription not found.' }, { status: 404 })
  }
}

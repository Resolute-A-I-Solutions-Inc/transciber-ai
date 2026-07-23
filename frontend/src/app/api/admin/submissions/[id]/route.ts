import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

function requireAdmin(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) return false
  return request.headers.get('x-admin-key') === adminKey
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  try {
    const row = await prisma.transcription.delete({
      where: { id },
      select: { mediaPath: true },
    })

    // Note: media file cleanup should be handled by FastAPI or a separate cleanup job
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ detail: 'Submission not found.' }, { status: 404 })
  }
}

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
    const result = await prisma.transcription.aggregate({
      _count: { id: true },
    })

    const [done, pending, error] = await Promise.all([
      prisma.transcription.count({ where: { status: 'done' } }),
      prisma.transcription.count({ where: { status: 'pending' } }),
      prisma.transcription.count({ where: { status: 'error' } }),
    ])

    return NextResponse.json({
      total: result._count.id,
      done,
      pending,
      error,
    })
  } catch {
    return NextResponse.json({ total: 0, done: 0, pending: 0, error: 0 })
  }
}

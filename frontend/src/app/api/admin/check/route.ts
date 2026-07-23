import { NextResponse, type NextRequest } from 'next/server'

function requireAdmin(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) return false
  return request.headers.get('x-admin-key') === adminKey
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}

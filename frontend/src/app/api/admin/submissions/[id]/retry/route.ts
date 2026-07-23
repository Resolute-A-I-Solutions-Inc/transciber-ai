import { NextResponse, type NextRequest } from 'next/server'

const FASTAPI = process.env.FASTAPI_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ADMIN_KEY || request.headers.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  // Proxy retry to FastAPI
  try {
    const res = await fetch(`${FASTAPI}/api/admin/submissions/${id}/retry`, {
      method: 'POST',
      headers: { 'X-Admin-Key': process.env.ADMIN_KEY || '' },
    })
    const body = await res.json()
    return NextResponse.json(body, { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'FastAPI backend unavailable.' }, { status: 502 })
  }
}

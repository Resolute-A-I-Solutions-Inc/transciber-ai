'use client'

import dynamic from 'next/dynamic'

const Admin = dynamic(() => import('@/Admin'), { ssr: false })

export default function AdminPage() {
  return <Admin />
}

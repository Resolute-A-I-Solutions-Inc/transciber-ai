import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'transcriber.ai — AI audio & video transcription',
  description: 'Drop an audio or video file — or paste a link — and get an editable, timestamped transcript.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

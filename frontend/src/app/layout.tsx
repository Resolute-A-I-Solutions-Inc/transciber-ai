import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Transcriber AI — Audio and video transcription',
  description: 'Turn meetings, interviews, lectures, and videos into editable, timestamped transcripts with local Whisper or optional Gemini.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}

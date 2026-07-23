import { useRef, useState } from 'react'
import type { TranscriptResult } from '../api'
import { mediaUrl } from '../api'
import { clock, downloadText } from '../format'

// SVG Icons for ReviewPanel
const Icons = {
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
}

interface Props {
  mediaId: string
  contentType: string
  result: TranscriptResult
  onRestart: () => void
}

export default function ReviewPanel({ mediaId, contentType, result, onRestart }: Props) {
  const [text, setText] = useState(result.full_text)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const isVideo = contentType.startsWith('video/')
  const src = mediaUrl(mediaId)

  function seek(seconds: number) {
    const el = mediaRef.current
    if (el) {
      el.currentTime = seconds
      el.play().catch(() => {/* ignore autoplay block */})
    }
  }

  return (
    <div className="review2">
      {/* LEFT — media player */}
      <div className="review2__left">
        <div className="player">
          {isVideo ? (
            <video ref={mediaRef} src={src} controls preload="metadata" className="player__media" />
          ) : (
            <audio ref={mediaRef} src={src} controls preload="metadata" className="player__media player__media--audio" />
          )}
        </div>
        <p className="player__hint">
          <Icons.Play /> Click a segment on the right to jump the player to that moment.
        </p>
      </div>

      {/* RIGHT — transcript editor */}
      <div className="review2__right">
        <div className="review__toolbar">
          <div className="review__lang">
            Detected language: <strong>{result.language_detected || 'unknown'}</strong>
          </div>
          <div className="review__actions">
            <button className="btn btn--ghost" onClick={() => downloadText('transcript.txt', text)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Download /> .txt
            </button>
            <button
              className="btn btn--primary"
              onClick={() => downloadText('transcript.srt', result.srt, 'application/x-subrip')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icons.Download /> .srt
            </button>
            <button className="btn btn--ghost" onClick={onRestart} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Plus /> New
            </button>
          </div>
        </div>

        <label className="review__editlabel">Transcript (editable)</label>
        <textarea
          className="review__text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck
        />

        {result.segments.length > 0 && (
          <div className="review__segments">
            <h3>Segments &amp; timestamps</h3>
            <ul>
              {result.segments.map((s, i) => (
                <li key={i}>
                  <button className="ts ts--btn" onClick={() => seek(s.start)} title="Play from here">
                    {clock(s.start)} – {clock(s.end)}
                  </button>
                  <span className="seg-text">{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

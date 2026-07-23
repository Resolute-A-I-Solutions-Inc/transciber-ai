import { useState } from 'react'
import type { TranscriptResult } from '../api'
import { clock, downloadText } from '../format'

interface Props {
  result: TranscriptResult
  onRestart: () => void
}

export default function ReviewPanel({ result, onRestart }: Props) {
  const [text, setText] = useState(result.full_text)

  return (
    <div className="card review">
      {/* Download actions pinned at the top of the panel — always visible. */}
      <div className="review__toolbar">
        <div className="review__lang">
          Detected language: <strong>{result.language_detected || 'unknown'}</strong>
        </div>
        <div className="review__actions">
          <button
            className="btn btn--ghost"
            onClick={() => downloadText('transcript.txt', text)}
          >
            ⬇ Download .txt
          </button>
          <button
            className="btn btn--primary"
            onClick={() => downloadText('transcript.srt', result.srt, 'application/x-subrip')}
          >
            ⬇ Download .srt
          </button>
          <button className="btn btn--ghost" onClick={onRestart}>
            New transcription
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
                <span className="ts">{clock(s.start)} – {clock(s.end)}</span>
                <span className="seg-text">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

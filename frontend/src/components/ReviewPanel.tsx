import { useRef, useState } from 'react'
import type { TranscriptResult } from '../api'
import { mediaUrl } from '../api'
import { clock, downloadText } from '../format'
import Icon from './Icon'

interface Props { mediaId: string; contentType: string; result: TranscriptResult; onRestart: () => void }

export default function ReviewPanel({ mediaId, contentType, result, onRestart }: Props) {
  const [text, setText] = useState(result.full_text)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const isVideo = contentType.startsWith('video/')
  const src = mediaUrl(mediaId)
  function seek(seconds: number) { const el = mediaRef.current; if (el) { el.currentTime = seconds; el.play().catch(() => {}) } }
  return (
    <div className="review2">
      <div className="review2__left">
        <div className="player">{isVideo ? <video ref={mediaRef} src={src} controls preload="metadata" className="player__media" /> : <audio ref={mediaRef} src={src} controls preload="metadata" className="player__media player__media--audio" />}</div>
        <p className="player__hint"><Icon name="play" size={14} /> Select a timestamp to play from that moment.</p>
      </div>
      <div className="review2__right">
        <div className="review__toolbar">
          <div className="review__lang"><Icon name="globe" size={16} /> Detected language: <strong>{result.language_detected || 'unknown'}</strong></div>
          <div className="review__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => downloadText('transcript.txt', text)}><Icon name="download" size={16} /> TXT</button>
            <button className="btn btn--primary btn--sm" onClick={() => downloadText('transcript.srt', result.srt, 'application/x-subrip')}><Icon name="download" size={16} /> SRT</button>
            <button className="btn btn--ghost btn--sm" onClick={onRestart}><Icon name="add" size={16} /> New</button>
          </div>
        </div>
        <label className="review__editlabel" htmlFor="transcript-editor">Editable transcript</label>
        <textarea id="transcript-editor" className="review__text" value={text} onChange={(e) => setText(e.target.value)} spellCheck />
        {result.segments.length > 0 && <div className="review__segments"><h3>Segments and timestamps</h3><ul>{result.segments.map((s, i) => <li key={i}><button className="ts ts--btn" onClick={() => seek(s.start)} title="Play from here">{clock(s.start)}–{clock(s.end)}</button><span className="seg-text">{s.text}</span></li>)}</ul></div>}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { listTranscriptions, type TranscriptionSummary } from '../api'

interface Props {
  /** Bumping this refetches the list (e.g. after a new transcription). */
  refreshKey: number
  onOpen: (id: string) => void
}

export default function History({ refreshKey, onOpen }: Props) {
  const [items, setItems] = useState<TranscriptionSummary[]>([])

  useEffect(() => {
    listTranscriptions()
      .then(setItems)
      .catch(() => setItems([]))
  }, [refreshKey])

  if (items.length === 0) return null

  return (
    <section className="history">
      <h2 className="history__title">Recent transcriptions</h2>
      <ul className="history__list">
        {items.map((it) => (
          <li key={it.id}>
            <button
              className="history__item"
              onClick={() => it.status === 'done' && onOpen(it.id)}
              disabled={it.status !== 'done'}
              title={it.status === 'done' ? 'Open transcript' : `Status: ${it.status}`}
            >
              <div className="history__row">
                <span className="history__name">{it.source_name || it.id}</span>
                <span className={`history__badge history__badge--${it.status}`}>{it.status}</span>
              </div>
              <div className="history__meta">
                {new Date(it.created_at).toLocaleString()} · {it.engine}
                {it.language_detected ? ` · ${it.language_detected}` : ''}
              </div>
              {it.preview && <div className="history__preview">{it.preview}</div>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

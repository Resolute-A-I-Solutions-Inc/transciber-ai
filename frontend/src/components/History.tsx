import { useEffect, useState } from 'react'
import { listTranscriptions, type TranscriptionSummary } from '../api'
import Icon from './Icon'
interface Props { refreshKey: number; onOpen: (id: string) => void }
export default function History({ refreshKey, onOpen }: Props) {
  const [items, setItems] = useState<TranscriptionSummary[]>([])
  useEffect(() => { listTranscriptions().then(setItems).catch(() => setItems([])) }, [refreshKey])
  if (items.length === 0) return null
  return <section className="history"><div className="history__heading"><h2 className="history__title">Recent transcriptions</h2><span>{items.length} saved</span></div><ul className="history__list">{items.map((it) => <li key={it.id}><button className="history__item" onClick={() => it.status === 'done' && onOpen(it.id)} disabled={it.status !== 'done'} title={it.status === 'done' ? 'Open transcript' : `Status: ${it.status}`}><span className="history__file"><span className="history__icon"><Icon name="file" size={18} /></span><span><span className="history__name">{it.source_name || it.id}</span><span className="history__meta">{new Date(it.created_at).toLocaleString()} · {it.engine}{it.language_detected ? ` · ${it.language_detected}` : ''}</span></span></span><span className={`history__badge history__badge--${it.status}`}>{it.status}</span>{it.preview && <span className="history__preview">{it.preview}</span>}</button></li>)}</ul></section>
}

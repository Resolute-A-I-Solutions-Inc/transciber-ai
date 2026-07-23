import { useEffect, useState } from 'react'
import { fetchLanguages, type LanguageOption } from '../api'
import UploadZone from './UploadZone'
import Icon from './Icon'

export interface UploadPayload {
  file: File | null
  url: string
  language: string
  engine: string
}

interface Props { onSubmit: (payload: UploadPayload) => void }

export default function UploadStep({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('auto')
  const [engine, setEngine] = useState('whisper')
  const [languages, setLanguages] = useState<LanguageOption[]>([{ code: 'auto', name: 'Auto-detect' }])

  useEffect(() => { fetchLanguages().then(setLanguages).catch(() => {}) }, [])
  const hasInput = file !== null || url.trim().length > 0

  return (
    <div className="card upload-card">
      <UploadZone file={file} onFile={(f) => { setFile(f); if (f) setUrl('') }} />
      <div className="divider"><span>or use a link</span></div>
      <label className="url-field">
        <span className="sr-only">Audio or video URL</span>
        <Icon name="link" size={18} />
        <input className="text-input" type="url" inputMode="url" placeholder="Paste a YouTube or direct media URL" value={url} onChange={(e) => { setUrl(e.target.value); if (e.target.value.trim()) setFile(null) }} />
      </label>
      <div className="controls">
        <label className="field"><span className="field__label">Language</span><span className="select-wrap"><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select><Icon name="chevron-down" size={16} /></span></label>
        <label className="field"><span className="field__label">Engine</span><span className="select-wrap"><select value={engine} onChange={(e) => setEngine(e.target.value)}><option value="whisper">Whisper (local)</option><option value="gemini">Gemini (cloud)</option></select><Icon name="chevron-down" size={16} /></span></label>
      </div>
      <button className="btn btn--primary btn--block" disabled={!hasInput} onClick={() => onSubmit({ file, url: url.trim(), language, engine })}><Icon name="waveform" size={18} />Transcribe now</button>
    </div>
  )
}

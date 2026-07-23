import { useEffect, useState } from 'react'
import { fetchLanguages, type LanguageOption } from '../api'
import UploadZone from './UploadZone'

export interface UploadPayload {
  file: File | null
  url: string
  language: string
  engine: string
}

interface Props {
  onSubmit: (payload: UploadPayload) => void
}

export default function UploadStep({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('auto')
  const [engine, setEngine] = useState('whisper')
  const [languages, setLanguages] = useState<LanguageOption[]>([
    { code: 'auto', name: 'Auto-detect' },
  ])

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch(() => {/* keep the Auto-detect fallback */})
  }, [])

  const hasInput = file !== null || url.trim().length > 0

  return (
    <div className="card">
      <UploadZone
        file={file}
        onFile={(f) => {
          setFile(f)
          if (f) setUrl('')
        }}
      />

      <div className="divider"><span>or paste a link</span></div>

      <input
        className="text-input"
        type="url"
        inputMode="url"
        placeholder="https://…  (YouTube or direct audio/video URL)"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          if (e.target.value.trim()) setFile(null)
        }}
      />

      <div className="controls">
        <label className="field">
          <span className="field__label">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Engine</span>
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            <option value="whisper">Whisper (local)</option>
            <option value="gemini">Gemini (cloud)</option>
          </select>
        </label>
      </div>

      <button
        className="btn btn--primary btn--block"
        disabled={!hasInput}
        onClick={() => onSubmit({ file, url: url.trim(), language, engine })}
      >
        TRANSCRIBE NOW
      </button>
    </div>
  )
}

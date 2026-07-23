import { useRef, useState } from 'react'
import Icon from './Icon'

interface Props { file: File | null; onFile: (file: File | null) => void; disabled?: boolean }

export default function UploadZone({ file, onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  function pick() { if (!disabled) inputRef.current?.click() }
  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); if (!disabled) { const dropped = e.dataTransfer.files?.[0]; if (dropped) onFile(dropped) } }
  return (
    <div className={`dropzone${dragging ? ' dropzone--over' : ''}${file ? ' dropzone--filled' : ''}`} onClick={pick} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pick()} aria-label="Upload audio or video file">
      <input ref={inputRef} type="file" accept="audio/*,video/*,.wav,.m4a,.mp4,.mov,.webm,.mp3,.flac" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <div className="dropzone__icon" aria-hidden><Icon name={file ? 'file' : 'upload'} size={28} /></div>
      {file ? <><p className="dropzone__title">{file.name}</p><p className="dropzone__hint">{(file.size / (1024 * 1024)).toFixed(1)} MB · click to choose another</p></> : <><p className="dropzone__title">Drop an audio or video file here</p><p className="dropzone__hint">or click to browse · WAV, M4A, MP3, MP4, MOV, WEBM</p></>}
    </div>
  )
}

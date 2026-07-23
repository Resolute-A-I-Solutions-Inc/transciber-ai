export interface Segment {
  start: number
  end: number
  text: string
}

export interface TranscriptResult {
  segments: Segment[]
  full_text: string
  language_detected: string
  srt: string
  vtt: string
}

export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'converting'
  | 'transcribing'
  | 'done'
  | 'error'

export interface Job {
  id: string
  status: JobStatus
  phase: string
  progress: number | null
  result: TranscriptResult | null
  error: string | null
}

export interface LanguageOption {
  code: string
  name: string
}

const API = '/api'

async function detail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body.detail || res.statusText
  } catch {
    return res.statusText
  }
}

export async function fetchLanguages(): Promise<LanguageOption[]> {
  const res = await fetch(`${API}/languages`)
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export interface SubmitOptions {
  file?: File | null
  url?: string
  language: string
  engine: string
}

export async function submitTranscription(opts: SubmitOptions): Promise<string> {
  const fd = new FormData()
  if (opts.file) fd.append('file', opts.file)
  if (opts.url) fd.append('url', opts.url)
  fd.append('language', opts.language)
  fd.append('engine', opts.engine)

  const res = await fetch(`${API}/transcribe`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await detail(res))
  const body = await res.json()
  return body.job_id as string
}

export async function getJob(id: string): Promise<Job> {
  const res = await fetch(`${API}/jobs/${id}`)
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export interface TranscriptionSummary {
  id: string
  created_at: string
  source_type: string
  source_name: string
  engine: string
  status: string
  language_detected: string
  preview: string
}

export async function listTranscriptions(): Promise<TranscriptionSummary[]> {
  const res = await fetch(`${API}/transcriptions`)
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export async function getTranscription(id: string): Promise<TranscriptResult> {
  const res = await fetch(`${API}/transcriptions/${id}`)
  if (!res.ok) throw new Error(await detail(res))
  const r = await res.json()
  return {
    segments: r.segments || [],
    full_text: r.full_text || '',
    language_detected: r.language_detected || '',
    srt: r.srt || '',
    vtt: r.vtt || '',
  }
}

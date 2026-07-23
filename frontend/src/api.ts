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

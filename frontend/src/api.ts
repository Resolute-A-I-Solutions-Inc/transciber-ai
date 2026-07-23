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
  content_type?: string
  media_path?: string
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

  // Submit to FastAPI via rewrite proxy
  const res = await fetch(`${API}/transcribe`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await detail(res))
  const body = await res.json()
  return body.job_id as string
}

export async function getJob(id: string): Promise<Job> {
  // Poll FastAPI via rewrite proxy
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
  // Read from Next.js API route (Prisma)
  const res = await fetch(`${API}/transcriptions`)
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export interface OpenedTranscript {
  result: TranscriptResult
  contentType: string
}

export async function getTranscription(id: string): Promise<OpenedTranscript> {
  // Read from Next.js API route (Prisma)
  const res = await fetch(`${API}/transcriptions/${id}`)
  if (!res.ok) throw new Error(await detail(res))
  const r = await res.json()
  return {
    result: {
      segments: r.segments || [],
      full_text: r.full_text || '',
      language_detected: r.language_detected || '',
      srt: r.srt || '',
      vtt: r.vtt || '',
    },
    contentType: r.content_type || '',
  }
}

/** URL of the stored media for a submission (streams with range support). */
export function mediaUrl(id: string): string {
  return `${API}/media/${id}`
}

// --- Admin API (all calls require the X-Admin-Key header) -------------------
export interface Submission {
  id: string
  created_at: string
  source_type: string
  source_name: string
  source_url: string
  engine: string
  language: string
  status: string
  language_detected: string
  content_type: string
  duration: number | null
  has_transcript: boolean
}

export interface AdminStats {
  total: number
  done: number
  pending: number
  error: number
}

function adminHeaders(key: string): HeadersInit {
  return { 'X-Admin-Key': key }
}

/** Returns true if the key is valid, false on 401/503. */
export async function adminCheck(key: string): Promise<boolean> {
  const res = await fetch(`${API}/admin/check`, { headers: adminHeaders(key) })
  return res.ok
}

export async function adminStats(key: string): Promise<AdminStats> {
  const res = await fetch(`${API}/admin/stats`, { headers: adminHeaders(key) })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export async function adminListSubmissions(key: string): Promise<Submission[]> {
  const res = await fetch(`${API}/admin/submissions`, { headers: adminHeaders(key) })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export async function adminDelete(key: string, id: string): Promise<void> {
  const res = await fetch(`${API}/admin/submissions/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key),
  })
  if (!res.ok) throw new Error(await detail(res))
}

export async function adminRetry(key: string, id: string): Promise<void> {
  const res = await fetch(`${API}/admin/submissions/${id}/retry`, {
    method: 'POST',
    headers: adminHeaders(key),
  })
  if (!res.ok) throw new Error(await detail(res))
}

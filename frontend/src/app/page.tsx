'use client'

import { useEffect, useRef, useState } from 'react'
import Stepper from '@/components/Stepper'
import UploadStep, { type UploadPayload } from '@/components/UploadStep'
import ProcessingStep from '@/components/ProcessingStep'
import ReviewPanel from '@/components/ReviewPanel'
import ErrorStep from '@/components/ErrorStep'
import History from '@/components/History'
import { getJob, getTranscription, submitTranscription, type Job } from '@/api'

type Phase = 'upload' | 'processing' | 'review' | 'error'

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [historyKey, setHistoryKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  function stopTimers() {
    clearInterval(pollRef.current)
    clearInterval(timerRef.current)
  }

  function reset() {
    stopTimers()
    setJob(null)
    setError('')
    setElapsed(0)
    setPhase('upload')
  }

  async function start(payload: UploadPayload) {
    stopTimers()
    setJob(null)
    setError('')
    setElapsed(0)
    setPhase('processing')
    try {
      const id = await submitTranscription(payload)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
      pollRef.current = setInterval(async () => {
        try {
          const j = await getJob(id)
          setJob(j)
          if (j.status === 'done') {
            stopTimers()
            setHistoryKey((k) => k + 1)
            setPhase('review')
          } else if (j.status === 'error') {
            stopTimers()
            setError(j.error || 'Unknown error')
            setPhase('error')
          }
        } catch (err) {
          stopTimers()
          setError(err instanceof Error ? err.message : String(err))
          setPhase('error')
        }
      }, 1000)
    } catch (err) {
      stopTimers()
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  async function openHistory(id: string) {
    try {
      const { result, contentType } = await getTranscription(id)
      setError('')
      setJob({
        id, status: 'done', phase: 'Done', progress: 1, result, error: null,
        content_type: contentType,
      })
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  useEffect(() => stopTimers, [])

  // Deep-link from the admin dashboard: /?open=<id> opens that transcript.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open')
    if (id) {
      openHistory(id)
      window.history.replaceState({}, '', '/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeStep = phase === 'upload' ? 0 : phase === 'review' ? 2 : 1

  return (
    <div className="app">
      {/* Login Button */}
      <a href="/admin" className="login-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Sign In
      </a>

      <header className="hero">
        <h1>transcriber<span>.ai</span></h1>
        <p>
          Drop an audio or video file — or paste a link — and get an editable,
          timestamped transcript.
        </p>
      </header>

      <Stepper active={activeStep} error={phase === 'error'} />

      <main className="stage">
        {phase === 'upload' && (
          <>
            <UploadStep onSubmit={start} />
            <History refreshKey={historyKey} onOpen={openHistory} />
          </>
        )}
        {phase === 'processing' && <ProcessingStep job={job} elapsed={elapsed} />}
        {phase === 'review' && job?.result && (
          <ReviewPanel
            mediaId={job.id}
            contentType={job.content_type || ''}
            result={job.result}
            onRestart={reset}
          />
        )}
        {phase === 'error' && <ErrorStep message={error} onRestart={reset} />}
      </main>

      <footer className="foot">
        Local OpenAI Whisper · optional Google Gemini · with Whisper your files never leave this machine.
        <br />
        <a className="navlink" href="/admin">Admin dashboard →</a>
      </footer>
    </div>
  )
}

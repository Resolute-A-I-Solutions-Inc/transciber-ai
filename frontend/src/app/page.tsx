'use client'

import { useEffect, useRef, useState } from 'react'
import Stepper from '@/components/Stepper'
import UploadStep, { type UploadPayload } from '@/components/UploadStep'
import ProcessingStep from '@/components/ProcessingStep'
import ReviewPanel from '@/components/ReviewPanel'
import ErrorStep from '@/components/ErrorStep'
import History from '@/components/History'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
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
      setJob({ id, status: 'done', phase: 'Done', progress: 1, result, error: null, content_type: contentType })
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  useEffect(() => stopTimers, [])

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open')
    if (id) {
      openHistory(id)
      window.history.replaceState({}, '', '/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeStep = phase === 'upload' ? 0 : phase === 'review' ? 2 : 1
  const workspaceTitle = phase === 'upload'
    ? 'Start with a file or link'
    : phase === 'processing'
      ? 'Creating your transcript'
      : phase === 'review'
        ? 'Review your transcript'
        : 'Something went wrong'

  return (
    <div className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a href="/" className="brand-link" aria-label="Transcriber AI home"><Brand /></a>
        <div className="topbar__actions">
          <a className="btn btn--ghost btn--sm" href="/admin"><Icon name="lock" size={16} /> Log in</a>
          <a className="btn btn--primary btn--sm" href="#transcribe">Transcribe now</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow"><Icon name="waveform" size={16} /> Clear words from any recording</p>
          <h1>Turn recordings into transcripts you can use.</h1>
          <p className="hero__lead">Upload a meeting, interview, lecture, or video. Get an editable transcript with timestamps, ready to review and export.</p>
          <div className="hero__actions">
            <a className="btn btn--primary btn--lg" href="#transcribe">Start transcribing <Icon name="chevron-down" size={18} /></a>
            <span className="hero__note">No setup required</span>
          </div>
          <ul className="format-list" aria-label="Supported input types">
            <li><Icon name="file" size={16} /> Audio and video files</li>
            <li><Icon name="link" size={16} /> YouTube and direct links</li>
            <li><Icon name="download" size={16} /> TXT and SRT exports</li>
          </ul>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="transcript-preview">
            <div className="transcript-preview__top">
              <span className="preview-file"><Icon name="file" size={18} /> team-interview.mp4</span>
              <span className="status-pill status-pill--done"><span /> Complete</span>
            </div>
            <div className="waveform">
              {[18, 34, 22, 52, 68, 42, 26, 58, 82, 46, 30, 66, 44, 74, 38, 56, 24, 40, 20].map((height, i) => <span key={i} style={{ height }} />)}
            </div>
            <div className="preview-segment"><span>00:18</span><p>The clearest next step is to turn the discussion into something the whole team can use.</p></div>
            <div className="preview-segment preview-segment--muted"><span>00:27</span><p>We can review the transcript, make edits, and share it before the next meeting.</p></div>
          </div>
        </div>
      </header>

      <main>
        <section id="transcribe" className="workspace-section" aria-labelledby="workspace-title">
          <div className="section-heading">
            <p className="eyebrow">Transcription workspace</p>
            <h2 id="workspace-title">{workspaceTitle}</h2>
            <p>Your work stays in one focused flow, from upload to export.</p>
          </div>
          <div className="workspace">
            <Stepper active={activeStep} error={phase === 'error'} />
            <div className="stage">
              {phase === 'upload' && <><UploadStep onSubmit={start} /><History refreshKey={historyKey} onOpen={openHistory} /></>}
              {phase === 'processing' && <ProcessingStep job={job} elapsed={elapsed} />}
              {phase === 'review' && job?.result && <ReviewPanel mediaId={job.id} contentType={job.content_type || ''} result={job.result} onRestart={reset} />}
              {phase === 'error' && <ErrorStep message={error} onRestart={reset} />}
            </div>
          </div>
        </section>

        <section className="capabilities" aria-labelledby="capabilities-title">
          <div className="capabilities__intro"><p className="eyebrow">Built for practical work</p><h2 id="capabilities-title">Choose how you process. Keep control of the result.</h2></div>
          <div className="capability-grid">
            <article><span className="feature-icon"><Icon name="lock" /></span><h3>Private by default</h3><p>Use local Whisper to keep media on your machine, without API fees.</p></article>
            <article><span className="feature-icon"><Icon name="waveform" /></span><h3>Cloud when you need it</h3><p>Switch to Gemini when a cloud transcription workflow suits the job.</p></article>
            <article><span className="feature-icon"><Icon name="clock" /></span><h3>Ready to refine</h3><p>Edit the transcript, jump to timestamps, and export TXT or SRT files.</p></article>
          </div>
        </section>
      </main>

      <footer className="foot">
        <a href="/" className="brand-link" aria-label="Transcriber AI home"><Brand /></a>
        <p>Local Whisper or optional Gemini transcription.</p>
        <a className="navlink" href="/admin">Admin dashboard</a>
      </footer>
    </div>
  )
}

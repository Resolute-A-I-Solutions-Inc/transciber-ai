import { useEffect, useRef, useState } from 'react'
import Stepper from './components/Stepper'
import UploadStep, { type UploadPayload } from './components/UploadStep'
import ProcessingStep from './components/ProcessingStep'
import ReviewPanel from './components/ReviewPanel'
import ErrorStep from './components/ErrorStep'
import History from './components/History'
import { getJob, getTranscription, submitTranscription, type Job } from './api'

type Phase = 'upload' | 'processing' | 'review' | 'error'

export default function App() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [historyKey, setHistoryKey] = useState(0)
  const pollRef = useRef<number | undefined>(undefined)
  const timerRef = useRef<number | undefined>(undefined)

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
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
      pollRef.current = window.setInterval(async () => {
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
      const result = await getTranscription(id)
      setError('')
      setJob({ id, status: 'done', phase: 'Done', progress: 1, result, error: null })
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  useEffect(() => stopTimers, [])

  const activeStep = phase === 'upload' ? 0 : phase === 'review' ? 2 : 1

  return (
    <div className="app">
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
          <ReviewPanel result={job.result} onRestart={reset} />
        )}
        {phase === 'error' && <ErrorStep message={error} onRestart={reset} />}
      </main>

      <footer className="foot">
        Local OpenAI Whisper · optional Google Gemini · with Whisper your files never leave this machine.
      </footer>
    </div>
  )
}

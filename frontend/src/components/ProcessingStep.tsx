import type { Job } from '../api'
import Icon from './Icon'
interface Props { job: Job | null; elapsed: number }
export default function ProcessingStep({ job, elapsed }: Props) {
  const phase = job?.phase ?? 'Starting…'
  const pct = job && job.progress != null ? Math.round(job.progress * 100) : null
  return <div className="card processing"><div className="processing__icon" aria-hidden><Icon name="waveform" size={28} /></div><h2 className="processing__phase">{phase}</h2><div className={`progress${pct == null ? ' progress--indeterminate' : ''}`}><div className="progress__bar" style={pct == null ? undefined : { width: `${pct}%` }} /></div><p className="processing__meta">{pct != null ? `${pct}%` : 'Working…'} · {elapsed}s elapsed</p><p className="processing__note">Large files can take a while to process. Keep this tab open while we work.</p></div>
}

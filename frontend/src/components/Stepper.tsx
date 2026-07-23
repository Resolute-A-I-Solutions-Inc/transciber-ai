import Icon, { type IconName } from './Icon'

const STEPS: { label: string; icon: IconName }[] = [{ label: 'Add media', icon: 'upload' }, { label: 'Transcribe', icon: 'microphone' }, { label: 'Review', icon: 'file' }]
interface Props { active: number; error?: boolean }

export default function Stepper({ active, error = false }: Props) {
  return <ol className="stepper" aria-label="Progress">{STEPS.map(({ label, icon }, i) => {
    const state = i < active ? 'done' : i === active ? (error ? 'error' : 'active') : 'todo'
    return <li key={label} className={`step step--${state}`}><span className="step__dot"><Icon name={state === 'done' ? 'check' : state === 'error' ? 'error' : icon} size={16} /></span><span className="step__label">{label}</span></li>
  })}</ol>
}

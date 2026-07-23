const STEPS = ['Upload Audio/Video', 'Transcribe', 'Review & Edit']

interface Props {
  /** 0-based index of the active step. */
  active: number
  /** Render the active step in an error state. */
  error?: boolean
}

export default function Stepper({ active, error = false }: Props) {
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state =
          i < active ? 'done' : i === active ? (error ? 'error' : 'active') : 'todo'
        return (
          <li key={label} className={`step step--${state}`}>
            <span className="step__dot">{state === 'done' ? '✓' : state === 'error' ? '!' : i + 1}</span>
            <span className="step__label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

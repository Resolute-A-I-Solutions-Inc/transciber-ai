interface Props {
  message: string
  onRestart: () => void
}

export default function ErrorStep({ message, onRestart }: Props) {
  return (
    <div className="card error-card">
      <div className="error-card__icon" aria-hidden>⚠️</div>
      <h2>Transcription failed</h2>
      <p className="error-card__msg">{message}</p>
      <button className="btn btn--primary" onClick={onRestart}>
        Start over
      </button>
    </div>
  )
}

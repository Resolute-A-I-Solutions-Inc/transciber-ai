import Icon from './Icon'

interface BrandProps {
  compact?: boolean
}

export default function Brand({ compact = false }: BrandProps) {
  return (
    <span className="brand">
      <span className="brand__mark" aria-hidden="true">
        <Icon name="waveform" size={22} />
        <span className="brand__cursor" />
      </span>
      {!compact && (
        <span className="brand__wordmark">
          transcriber<span>.ai</span>
        </span>
      )}
    </span>
  )
}

import type { SVGProps } from 'react'

export type IconName =
  | 'add'
  | 'check'
  | 'chevron-down'
  | 'clock'
  | 'delete'
  | 'download'
  | 'error'
  | 'eye'
  | 'eye-off'
  | 'file'
  | 'globe'
  | 'home'
  | 'link'
  | 'lock'
  | 'microphone'
  | 'open'
  | 'play'
  | 'refresh'
  | 'retry'
  | 'sign-out'
  | 'upload'
  | 'waveform'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export default function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    add: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4.25 4.25L19 6.5" />,
    'chevron-down': <path d="m7 10 5 5 5-5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.75V12l3 1.75" />
      </>
    ),
    delete: (
      <>
        <path d="M4.5 7h15M9 4.5h6M7 7l.75 12h8.5L17 7" />
        <path d="M10 10.5v5M14 10.5v5" />
      </>
    ),
    download: (
      <>
        <path d="M12 4.5v10M8.5 11l3.5 3.5 3.5-3.5" />
        <path d="M5 18.5h14" />
      </>
    ),
    error: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.75v5.5M12 16.5h.01" />
      </>
    ),
    eye: (
      <>
        <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" />
        <circle cx="12" cy="12" r="2.25" />
      </>
    ),
    'eye-off': (
      <>
        <path d="m4 4 16 16M9.5 7.35A9.2 9.2 0 0 1 12 7c5.5 0 8.5 5 8.5 5a13 13 0 0 1-2.15 2.65M14.4 16.65A9.2 9.2 0 0 1 12 17c-5.5 0-8.5-5-8.5-5a13.2 13.2 0 0 1 2.1-2.6" />
      </>
    ),
    file: (
      <>
        <path d="M7 3.75h6l4 4V20H7z" />
        <path d="M13 3.75V8h4M9.5 12h5M9.5 15.5h5" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.75 12h16.5M12 3.5c2.1 2.3 3.15 5.13 3.15 8.5S14.1 18.2 12 20.5C9.9 18.2 8.85 15.37 8.85 12S9.9 5.8 12 3.5Z" />
      </>
    ),
    home: (
      <>
        <path d="m4 10.5 8-6.25 8 6.25" />
        <path d="M6.5 9v10h11V9M10 19v-5.5h4V19" />
      </>
    ),
    link: (
      <>
        <path d="m9.25 14.75 5.5-5.5" />
        <path d="M7.5 16.5 6 18a3.18 3.18 0 0 1-4.5-4.5L5 10a3.18 3.18 0 0 1 4.5 0" />
        <path d="m16.5 7.5 1.5-1.5a3.18 3.18 0 0 1 4.5 4.5L19 14a3.18 3.18 0 0 1-4.5 0" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2.5" />
      </>
    ),
    microphone: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
      </>
    ),
    open: (
      <>
        <path d="M13 5h6v6M19 5l-8 8" />
        <path d="M17.5 14.5V19h-12V7h4.5" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5z" fill="currentColor" stroke="none" />,
    refresh: (
      <>
        <path d="M19 8.5V4.75M19 4.75h-3.75" />
        <path d="M18 7a8 8 0 1 0 1.2 8" />
      </>
    ),
    retry: (
      <>
        <path d="M18.5 9V5.25M18.5 5.25h-3.75" />
        <path d="M17.5 7.5a7.5 7.5 0 1 0 1.25 7.25" />
      </>
    ),
    'sign-out': (
      <>
        <path d="M10 5H5.5v14H10M13.5 8.5 17 12l-3.5 3.5M8.5 12H17" />
      </>
    ),
    upload: (
      <>
        <path d="M12 15V4.5M8.5 8 12 4.5 15.5 8" />
        <path d="M5 14.5v5h14v-5" />
      </>
    ),
    waveform: <path d="M4 13v-2M8 16V8M12 19V5M16 15V9M20 13v-2" />,
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}

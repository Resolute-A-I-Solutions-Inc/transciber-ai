import { NextResponse } from 'next/server'

// Language options come from Whisper's tokenizer — this is a static list.
// We keep it as a Next.js route so the frontend doesn't need to call FastAPI for this.
const AUTO = 'auto'
const WHISPER_LANGUAGES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
  fi: 'Finnish', pl: 'Polish', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian',
  ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian', sl: 'Slovenian', el: 'Greek',
  uk: 'Ukrainian', ru: 'Russian', tr: 'Turkish', ar: 'Arabic', he: 'Hebrew',
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', ur: 'Urdu',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', tl: 'Tagalog',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ca: 'Catalan', eu: 'Basque',
  gl: 'Galician', cy: 'Welsh', af: 'Afrikaans', et: 'Estonian', lv: 'Latvian',
  lt: 'Lithuanian', mt: 'Maltese', is: 'Icelandic', ga: 'Irish', mk: 'Macedonian',
  sq: 'Albanian', bs: 'Bosnian', sr: 'Serbian', sw: 'Swahili', mi: 'Maori',
  ml: 'Malayalam', jw: 'Javanese', su: 'Sundanese', yo: 'Yoruba', ha: 'Hausa',
  ig: 'Igbo', so: 'Somali', mg: 'Malagasy', ne: 'Nepali', si: 'Sinhala',
  my: 'Myanmar', ka: 'Georgian', am: 'Amharic', km: 'Khmer', lo: 'Lao',
  tt: 'Tatar', kk: 'Kazakh', uz: 'Uzbek', tg: 'Tajik', az: 'Azerbaijani',
}

export async function GET() {
  const options = [{ code: AUTO, name: 'Auto-detect' }]
  for (const [code, name] of Object.entries(WHISPER_LANGUAGES).sort((a, b) => a[1].localeCompare(b[1]))) {
    options.push({ code, name })
  }
  return NextResponse.json(options)
}

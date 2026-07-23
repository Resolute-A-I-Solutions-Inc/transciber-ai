'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminCheck, adminDelete, adminListSubmissions, adminRetry, adminStats, type AdminStats, type Submission } from './api'
import { clock } from './format'
import Brand from './components/Brand'
import Icon from './components/Icon'

const KEY_STORE = 'transcriber_admin_key'

export default function Admin() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (k: string) => {
    const [s, list] = await Promise.all([adminStats(k), adminListSubmissions(k)])
    setStats(s)
    setSubs(list)
  }, [])

  useEffect(() => {
    const storedKey = localStorage.getItem(KEY_STORE)
    if (storedKey) setKey(storedKey)
  }, [])

  useEffect(() => {
    if (!key) return
    adminCheck(key).then((ok) => {
      if (ok) { setAuthed(true); refresh(key).catch(() => {}) }
      else { localStorage.removeItem(KEY_STORE); setKey('') }
    })
  }, [key, refresh])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const ok = await adminCheck(keyInput)
    if (!ok) { setError('Invalid key, or admin is disabled because ADMIN_KEY is not set on the server.'); return }
    localStorage.setItem(KEY_STORE, keyInput)
    setKey(keyInput)
    setAuthed(true)
    try { await refresh(keyInput) } catch (err) { setError(String(err)) }
  }

  function logout() {
    localStorage.removeItem(KEY_STORE)
    setKey(''); setAuthed(false); setKeyInput(''); setSubs([]); setStats(null)
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this submission and its stored media file?')) return
    setBusy(true)
    try { await adminDelete(key, id); await refresh(key) }
    catch (err) { setError(String(err)) } finally { setBusy(false) }
  }

  async function onRetry(id: string) {
    setBusy(true)
    try { await adminRetry(key, id); await refresh(key) }
    catch (err) { setError(String(err)) } finally { setBusy(false) }
  }

  if (!authed) {
    return (
      <div className="login-page">
        <header className="login-header">
          <a href="/" className="brand-link" aria-label="Transcriber AI home"><Brand /></a>
          <a className="back-link" href="/"><Icon name="home" size={17} /> Back to transcriber</a>
        </header>
        <main className="login-main">
          <section className="login-intro" aria-labelledby="login-intro-title">
            <p className="eyebrow"><Icon name="lock" size={15} /> Secure administration</p>
            <h1 id="login-intro-title">Manage every transcript from one clear workspace.</h1>
            <p>Review submission activity, reopen completed transcripts, and resolve failed jobs without leaving the dashboard.</p>
            <ul className="login-benefits">
              <li><span><Icon name="check" size={16} /></span><div><strong>See system activity</strong><p>Track completed, pending, and failed submissions at a glance.</p></div></li>
              <li><span><Icon name="refresh" size={16} /></span><div><strong>Resolve failed jobs</strong><p>Retry a transcription while keeping its source information available.</p></div></li>
              <li><span><Icon name="lock" size={16} /></span><div><strong>Restricted access</strong><p>The dashboard remains protected by the server-side admin key.</p></div></li>
            </ul>
          </section>

          <section className="login-card" aria-labelledby="admin-login-title">
            <div className="login-card__mark"><Icon name="lock" size={23} /></div>
            <p className="login-card__kicker">Administrator access</p>
            <h2 id="admin-login-title">Log in to the dashboard</h2>
            <p className="login-card__intro">Use the admin key configured on this server to continue.</p>
            <form onSubmit={login} className="admin-login__form">
              <label className="field">
                <span className="field__label">Admin key</span>
                <span className="password-field">
                  <Icon name="lock" size={17} />
                  <input className="text-input" type={showPassword ? 'text' : 'password'} placeholder="Enter your admin key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} autoComplete="current-password" autoFocus />
                  <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide admin key' : 'Show admin key'} aria-pressed={showPassword}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </span>
              </label>
              <button className="btn btn--primary btn--block" type="submit">Log in <Icon name="open" size={16} /></button>
            </form>
            {error && <p className="admin__error" role="alert"><Icon name="error" size={17} />{error}</p>}
            <p className="login-card__help">The key is set through <code>ADMIN_KEY</code> in the server environment.</p>
          </section>
        </main>
        <footer className="login-footer"><span>Transcriber AI administration</span><span>Protected access</span></footer>
      </div>
    )
  }
  const statItems = stats ? [
    { label: 'Total submissions', value: stats.total, tone: 'neutral' },
    { label: 'Completed', value: stats.done, tone: 'success' },
    { label: 'Pending', value: stats.pending, tone: 'warning' },
    { label: 'Failed', value: stats.error, tone: 'danger' },
  ] : []

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="brand-link" aria-label="Transcriber AI home"><Brand /></a>
        <div className="admin-topbar__actions">
          <span className="admin__identity"><span className="admin__avatar">A</span><span>Admin</span></span>
          <a className="btn btn--ghost btn--sm" href="/"><Icon name="home" size={16} /> App</a>
          <button className="btn btn--ghost btn--sm" onClick={() => refresh(key)}><Icon name="refresh" size={16} /> Refresh</button>
          <button className="btn btn--ghost btn--sm" onClick={logout}><Icon name="sign-out" size={16} /> Sign out</button>
        </div>
      </header>

      <main className="admin">
        <div className="admin__head"><div><p className="eyebrow">Operations</p><h1>Submissions</h1><p>Review and manage transcription activity.</p></div></div>
        {stats && <div className="stats">{statItems.map((item) => <article className={`stat stat--${item.tone}`} key={item.label}><div className="stat__label">{item.label}</div><div className="stat__num">{item.value}</div><span className="stat__indicator" /></article>)}</div>}
        {error && <p className="admin__error" role="alert"><Icon name="error" size={17} />{error}</p>}
        <section className="records" aria-labelledby="records-title">
          <div className="records__head"><div><h2 id="records-title">All submissions</h2><p>{subs.length} {subs.length === 1 ? 'record' : 'records'}</p></div></div>
          <div className="table-wrap">
            <table className="subs">
              <thead><tr><th><span className="th-label"><Icon name="file" size={15} /> Source</span></th><th><span className="th-label"><Icon name="clock" size={15} /> Uploaded</span></th><th>Type</th><th>Duration</th><th>Status</th><th><span className="th-label"><Icon name="globe" size={15} /> Language</span></th><th>Actions</th></tr></thead>
              <tbody>
                {subs.length === 0 && <tr><td colSpan={7}><div className="empty-state"><span><Icon name="file" size={22} /></span><strong>No submissions yet</strong><p>New transcription jobs will appear here.</p></div></td></tr>}
                {subs.map((s) => <tr key={s.id}><td className="name" title={s.source_name || s.source_url}><span className="source-cell"><span className="source-cell__icon"><Icon name="file" size={17} /></span>{s.source_name || s.source_url || s.id}</span></td><td>{new Date(s.created_at).toLocaleString()}</td><td>{s.content_type || (s.source_type === 'url' ? 'URL' : 'â€”')}</td><td>{s.duration ? clock(s.duration) : 'â€”'}</td><td><span className={`badge badge--${s.status}`}><span />{s.status}</span></td><td>{s.language_detected || 'â€”'}</td><td><div className="row-actions">{s.has_transcript && <a className="btn btn--ghost btn--sm btn--icon-text" href={`/?open=${s.id}`}><Icon name="open" size={15} /> Open</a>}{s.status === 'error' && <button className="btn btn--ghost btn--sm btn--icon-text" disabled={busy} onClick={() => onRetry(s.id)}><Icon name="retry" size={15} /> Retry</button>}<button className="btn btn--danger btn--sm btn--icon-text" disabled={busy} onClick={() => onDelete(s.id)}><Icon name="delete" size={15} /> Delete</button></div></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

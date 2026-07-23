import { useCallback, useEffect, useState } from 'react'
import {
  adminCheck, adminDelete, adminListSubmissions, adminRetry, adminStats,
  type AdminStats, type Submission,
} from './api'
import { clock } from './format'

const KEY_STORE = 'transcriber_admin_key'

export default function Admin() {
  const [key, setKey] = useState<string>(() => localStorage.getItem(KEY_STORE) || '')
  const [authed, setAuthed] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (k: string) => {
    const [s, list] = await Promise.all([adminStats(k), adminListSubmissions(k)])
    setStats(s)
    setSubs(list)
  }, [])

  // Try a stored key on first load.
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
    if (!ok) { setError('Invalid key, or admin is disabled (ADMIN_KEY not set on the server).'); return }
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
      <div className="admin">
        <div className="card admin__login">
          <h1>Admin sign-in</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
            Enter the admin key (server env <code>ADMIN_KEY</code>).
          </p>
          <form onSubmit={login}>
            <input
              className="text-input"
              type="password"
              placeholder="Admin key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoFocus
            />
            <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} type="submit">
              Sign in
            </button>
          </form>
          {error && <p className="admin__error">{error}</p>}
          <p style={{ marginTop: 16 }}><a className="navlink" href="/">← Back to app</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <div className="admin__head">
        <h1>Submissions</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn btn--ghost btn--sm" href="/">← App</a>
          <button className="btn btn--ghost btn--sm" onClick={() => refresh(key)}>Refresh</button>
          <button className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button>
        </div>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat"><div className="stat__num">{stats.total}</div><div className="stat__label">Total</div></div>
          <div className="stat"><div className="stat__num" style={{ color: '#4ade80' }}>{stats.done}</div><div className="stat__label">Completed</div></div>
          <div className="stat"><div className="stat__num" style={{ color: '#facc15' }}>{stats.pending}</div><div className="stat__label">Pending</div></div>
          <div className="stat"><div className="stat__num" style={{ color: '#f87171' }}>{stats.error}</div><div className="stat__label">Failed</div></div>
        </div>
      )}

      {error && <p className="admin__error">{error}</p>}

      <div className="table-wrap">
        <table className="subs">
          <thead>
            <tr>
              <th>Source</th><th>Uploaded</th><th>Type</th><th>Duration</th>
              <th>Status</th><th>Language</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>No submissions yet.</td></tr>
            )}
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="name" title={s.source_name || s.source_url}>
                  {s.source_name || s.source_url || s.id}
                </td>
                <td>{new Date(s.created_at).toLocaleString()}</td>
                <td>{s.content_type || (s.source_type === 'url' ? 'url' : '—')}</td>
                <td>{s.duration ? clock(s.duration) : '—'}</td>
                <td><span className={`badge badge--${s.status}`}>{s.status}</span></td>
                <td>{s.language_detected || '—'}</td>
                <td>
                  <div className="row-actions">
                    {s.has_transcript && (
                      <a className="btn btn--ghost btn--sm" href={`/?open=${s.id}`}>Open</a>
                    )}
                    {s.status === 'error' && (
                      <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => onRetry(s.id)}>Retry</button>
                    )}
                    <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => onDelete(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

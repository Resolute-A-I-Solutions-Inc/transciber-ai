import { useCallback, useEffect, useState } from 'react'
import {
  adminCheck, adminDelete, adminListSubmissions, adminRetry, adminStats,
  type AdminStats, type Submission,
} from './api'
import { clock } from './format'

const KEY_STORE = 'transcriber_admin_key'

// SVG Icons
const Icons = {
  Refresh: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Open: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Retry: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Delete: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  File: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
}

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
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)'
            }}>
              <Icons.Lock />
            </div>
            <h1 style={{ margin: 0 }}>Admin Sign-in</h1>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
            Enter the admin key (server env <code style={{ 
              background: 'var(--card-2)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              fontFamily: 'var(--mono)'
            }}>ADMIN_KEY</code>).
          </p>
          <form onSubmit={login}>
            <input
              className="text-input"
              type="password"
              placeholder="Enter admin key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoFocus
            />
            <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--space-md)' }} type="submit">
              Sign in
            </button>
          </form>
          {error && <p className="admin__error">{error}</p>}
          <p style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
            <a className="navlink" href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Home /> Back to app
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <div className="admin__head">
        <h1>Submissions</h1>
        <div className="admin__user">
          <div className="admin__avatar">A</div>
          <span className="admin__username">Admin</span>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginLeft: 'var(--space-sm)' }}>
            <a className="btn btn--ghost btn--sm" href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Home /> App
            </a>
            <button className="btn btn--ghost btn--sm" onClick={() => refresh(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Refresh /> Refresh
            </button>
            <button className="btn btn--ghost btn--sm" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icons.Logout /> Sign out
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat">
            <div className="stat__num">{stats.total}</div>
            <div className="stat__label">Total</div>
          </div>
          <div className="stat">
            <div className="stat__num" style={{ color: '#4ade80' }}>{stats.done}</div>
            <div className="stat__label">Completed</div>
          </div>
          <div className="stat">
            <div className="stat__num" style={{ color: '#facc15' }}>{stats.pending}</div>
            <div className="stat__label">Pending</div>
          </div>
          <div className="stat">
            <div className="stat__num" style={{ color: '#f87171' }}>{stats.error}</div>
            <div className="stat__label">Failed</div>
          </div>
        </div>
      )}

      {error && <p className="admin__error">{error}</p>}

      <div className="table-wrap">
        <table className="subs">
          <thead>
            <tr>
              <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.File /> Source</span></th>
              <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.Clock /> Uploaded</span></th>
              <th>Type</th>
              <th>Duration</th>
              <th>Status</th>
              <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.Globe /> Language</span></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr><td colSpan={7} style={{ color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>No submissions yet.</td></tr>
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
                      <a className="btn btn--ghost btn--sm" href={`/?open=${s.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icons.Open /> Open
                      </a>
                    )}
                    {s.status === 'error' && (
                      <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => onRetry(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icons.Retry /> Retry
                      </button>
                    )}
                    <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => onDelete(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icons.Delete /> Delete
                    </button>
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

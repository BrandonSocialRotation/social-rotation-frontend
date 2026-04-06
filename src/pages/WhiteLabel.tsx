import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './WhiteLabel.css'

interface BrandingPayload {
  app_name?: string
  primary_color?: string
  logo_url?: string
  favicon_url?: string
}

interface ClientPortalDomainRow {
  id: number
  hostname: string
  user_id: number
  account_id: number
  branding: BrandingPayload
  created_at: string
  updated_at: string
}

interface SubAccountOption {
  id: number
  name: string
  email: string
  client_portal_only?: boolean
}

export default function WhiteLabel() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAgency = Boolean(user?.reseller || user?.super_admin)
  const isClientPortal = user?.client_portal_only === true

  const [showForm, setShowForm] = useState(false)
  const [hostname, setHostname] = useState('')
  const [userId, setUserId] = useState<number | ''>('')
  const [appName, setAppName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#4f46e5')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [error, setError] = useState('')

  const [editing, setEditing] = useState<ClientPortalDomainRow | null>(null)

  if (isClientPortal) {
    return <Navigate to="/dashboard" replace />
  }

  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['client_portal_domains'],
    queryFn: async () => {
      const res = await api.get('/client_portal_domains')
      return res.data as { client_portal_domains: ClientPortalDomainRow[] }
    },
    enabled: isAgency,
  })

  const { data: subAccountsData } = useQuery({
    queryKey: ['sub_accounts'],
    queryFn: async () => {
      const res = await api.get('/sub_accounts')
      return res.data as { sub_accounts: SubAccountOption[] }
    },
    enabled: isAgency,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const branding: BrandingPayload = {}
      if (appName.trim()) branding.app_name = appName.trim()
      if (primaryColor.trim()) branding.primary_color = primaryColor.trim()
      if (logoUrl.trim()) branding.logo_url = logoUrl.trim()
      if (faviconUrl.trim()) branding.favicon_url = faviconUrl.trim()
      return api.post('/client_portal_domains', {
        client_portal_domain: {
          hostname: hostname.trim(),
          user_id: userId,
          branding,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_portal_domains'] })
      setShowForm(false)
      setHostname('')
      setUserId('')
      setAppName('')
      setPrimaryColor('#4f46e5')
      setLogoUrl('')
      setFaviconUrl('')
      setError('')
    },
    onError: (err: any) => {
      const d = err.response?.data
      const msg = Array.isArray(d?.errors) ? d.errors.join(', ') : d?.error || d?.message || 'Could not save'
      setError(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; hostname?: string; branding: BrandingPayload }) => {
      return api.patch(`/client_portal_domains/${payload.id}`, {
        client_portal_domain: {
          ...(payload.hostname != null ? { hostname: payload.hostname } : {}),
          branding: payload.branding,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_portal_domains'] })
      setEditing(null)
      setError('')
    },
    onError: (err: any) => {
      const d = err.response?.data
      setError(Array.isArray(d?.errors) ? d.errors.join(', ') : d?.error || 'Update failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/client_portal_domains/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_portal_domains'] }),
  })

  const domains = domainsData?.client_portal_domains ?? []
  const subAccounts = subAccountsData?.sub_accounts ?? []
  /** Prefer client-portal sub-accounts in the dropdown */
  const clientOptions = subAccounts.filter((s) => s.client_portal_only !== false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!hostname.trim()) {
      setError('Hostname is required')
      return
    }
    if (userId === '') {
      setError('Choose which client account this hostname is for')
      return
    }
    createMutation.mutate()
  }

  const openEdit = (d: ClientPortalDomainRow) => {
    setEditing(d)
    setError('')
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const branding: BrandingPayload = { ...editing.branding }
    updateMutation.mutate({
      id: editing.id,
      hostname: editing.hostname,
      branding,
    })
  }

  if (!isAgency) {
    return (
      <div className="white-label-page">
        <p className="wl-muted">Only agency accounts can manage white-label domains.</p>
      </div>
    )
  }

  if (domainsLoading) {
    return (
      <div className="white-label-page">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="white-label-page">
      <div className="page-header">
        <div>
          <h1>White label</h1>
          <p className="wl-lead">
            Map a hostname from your domain pool to a <strong>client</strong> sub-account. When they sign in on that
            host, the app can show your branding—not Social Rotation.
          </p>
        </div>
        <button type="button" className="create-btn" onClick={() => { setShowForm(true); setError('') }}>
          + Add domain
        </button>
      </div>

      <div className="wl-subaccounts-pill">
        <span>Clients are sub-accounts.</span>
        <Link to="/sub-accounts">Manage sub-accounts</Link>
      </div>

      <div className="wl-callout">
        <strong>DNS &amp; SSL:</strong> Point the hostname (or CNAME) to this app and provision TLS on your host
        (e.g. DigitalOcean / Cloudflare). The API stores the mapping; your infrastructure serves HTTPS.
      </div>

      {domains.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>No white-label domains yet. Add one and assign it to a client sub-account.</p>
        </div>
      ) : (
        <div className="wl-grid">
          {domains.map((d) => (
            <div key={d.id} className="wl-card">
              <div className="wl-card-head">
                <h3>{d.branding?.app_name || d.hostname}</h3>
                <div className="wl-card-actions">
                  <button type="button" className="wl-btn-edit" onClick={() => openEdit(d)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="wl-btn-danger"
                    onClick={() => {
                      if (window.confirm(`Remove mapping for ${d.hostname}?`)) deleteMutation.mutate(d.id)
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="wl-host">
                <span className="wl-label">Hostname</span>
                {d.hostname}
              </p>
              <p className="wl-meta">
                <span className="wl-label">Client user ID</span> {d.user_id}
              </p>
              {d.branding?.primary_color && (
                <p className="wl-meta">
                  <span className="wl-label">Color</span>
                  <span className="wl-swatch" style={{ background: d.branding.primary_color }} />
                  {d.branding.primary_color}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !createMutation.isPending && setShowForm(false)}>
          <div className="modal wl-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add white-label domain</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="wl-hostname">Hostname</label>
                <input
                  id="wl-hostname"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="portal.clientbrand.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-client">Client (sub-account)</label>
                <select
                  id="wl-client"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">Select a client…</option>
                  {(clientOptions.length ? clientOptions : subAccounts).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="wl-appname">App / company name (shown to client)</label>
                <input
                  id="wl-appname"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Your Agency Name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-color">Primary color</label>
                <input
                  id="wl-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-logo">Logo URL (optional)</label>
                <input
                  id="wl-logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-favicon">Favicon URL (optional)</label>
                <input
                  id="wl-favicon"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => !updateMutation.isPending && setEditing(null)}>
          <div className="modal wl-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit white-label</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label htmlFor="wl-edit-host">Hostname</label>
                <input
                  id="wl-edit-host"
                  value={editing.hostname}
                  onChange={(e) => setEditing({ ...editing, hostname: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-edit-name">App name</label>
                <input
                  id="wl-edit-name"
                  value={editing.branding?.app_name || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      branding: { ...editing.branding, app_name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-edit-color">Primary color</label>
                <input
                  id="wl-edit-color"
                  type="color"
                  value={editing.branding?.primary_color || '#4f46e5'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      branding: { ...editing.branding, primary_color: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-edit-logo">Logo URL</label>
                <input
                  id="wl-edit-logo"
                  value={editing.branding?.logo_url || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      branding: { ...editing.branding, logo_url: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="wl-edit-favicon">Favicon URL</label>
                <input
                  id="wl-edit-favicon"
                  value={editing.branding?.favicon_url || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      branding: { ...editing.branding, favicon_url: e.target.value },
                    })
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

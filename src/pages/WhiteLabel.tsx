import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './WhiteLabel.css'
import { WHITE_LABEL_REGISTRAR_DOMAINS } from '../constants/whiteLabelRegistrarDomains'

const TOP_LEVEL_DOMAIN_OPTIONS = WHITE_LABEL_REGISTRAR_DOMAINS

interface WhiteLabelPayload {
  top_level_domain?: string | null
  business_name?: string | null
  software_title?: string | null
  business_address?: string | null
  business_city?: string | null
  business_state?: string | null
  business_country?: string | null
  business_postal_code?: string | null
  logo_url?: string | null
  favicon_url?: string | null
}

export default function WhiteLabel() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAgency = Boolean(user?.reseller || user?.super_admin)
  const isClientPortal = user?.client_portal_only === true

  const [topLevelDomain, setTopLevelDomain] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [softwareTitle, setSoftwareTitle] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [faviconUploading, setFaviconUploading] = useState(false)
  const [faviconError, setFaviconError] = useState('')

  /** Avoid overwriting the form on every user_info refetch (e.g. tab focus) — that was clearing typed values before save. */
  const didHydrateFormFromServer = useRef(false)

  const applyWhiteLabelToForm = (w: WhiteLabelPayload) => {
    setTopLevelDomain((w.top_level_domain || '').trim())
    setBusinessName(w.business_name || '')
    setSoftwareTitle(w.software_title || '')
    setAddress(w.business_address || '')
    setCity(w.business_city || '')
    setState(w.business_state || '')
    setCountry(w.business_country || '')
    setPostalCode(w.business_postal_code || '')
  }

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user_info'],
    queryFn: async () => {
      const res = await api.get('/user_info')
      return res.data as { user: { white_label?: WhiteLabelPayload | null } & Record<string, unknown> }
    },
    enabled: isAgency,
    refetchOnWindowFocus: false,
  })

  const wl = userData?.user?.white_label

  /** Include saved TLD from API if it’s not in the static list (otherwise the <select> shows blank). */
  const domainSelectOptions = useMemo(() => {
    const saved = (wl?.top_level_domain ?? '').trim()
    const base = [...TOP_LEVEL_DOMAIN_OPTIONS] as string[]
    if (saved && !base.includes(saved)) {
      return [saved, ...base]
    }
    return base
  }, [wl?.top_level_domain])

  useEffect(() => {
    const w = userData?.user?.white_label
    if (!w || didHydrateFormFromServer.current) return
    didHydrateFormFromServer.current = true
    applyWhiteLabelToForm(w)
  }, [userData?.user?.white_label])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/user_info', {
        white_label: {
          top_level_domain: topLevelDomain || null,
          business_name: businessName || null,
          software_title: softwareTitle || null,
          business_address: address || null,
          business_city: city || null,
          business_state: state || null,
          business_country: country || null,
          business_postal_code: postalCode || null,
        },
      })
      return res.data as {
        user?: { white_label?: WhiteLabelPayload | null }
        white_label_update_meta?: { persisted_keys?: string[]; dropped_keys?: string[] }
      }
    },
    onSuccess: (data) => {
      const w = data?.user?.white_label
      if (w) applyWhiteLabelToForm(w)
      queryClient.invalidateQueries({ queryKey: ['user_info'] })
      const dropped = data?.white_label_update_meta?.dropped_keys ?? []
      if (dropped.length > 0) {
        setSuccess(
          `Saved what the server could store. These fields were not saved (usually missing DB columns on the server): ${dropped.join(', ')}. Run migrations on the API host (rails db:migrate).`
        )
      } else {
        setSuccess('White label settings saved.')
      }
      setError('')
      setTimeout(() => setSuccess(''), 8000)
    },
    onError: (err: any) => {
      const d = err.response?.data
      const msg = Array.isArray(d?.errors) ? d.errors.join(', ') : d?.error || 'Could not save settings'
      setError(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    saveMutation.mutate()
  }

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('watermark_logo', file)
      await api.post('/user_info/watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['user_info'] })
    } catch (err: any) {
      setLogoError(err.response?.data?.error || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const handleFaviconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFaviconError('')
    setFaviconUploading(true)
    try {
      const formData = new FormData()
      formData.append('favicon_logo', file)
      await api.post('/user_info/favicon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['user_info'] })
    } catch (err: any) {
      setFaviconError(err.response?.data?.error || 'Favicon upload failed')
    } finally {
      setFaviconUploading(false)
      e.target.value = ''
    }
  }

  if (isClientPortal) {
    return <Navigate to="/dashboard" replace />
  }

  if (!isAgency) {
    return (
      <div className="wl-page">
        <p className="wl-muted">Only agency accounts can manage white label settings.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="wl-page">
        <p>Loading…</p>
      </div>
    )
  }

  const logoPreview = wl?.logo_url || (userData?.user as { watermark_logo_url?: string })?.watermark_logo_url
  const faviconPreview = wl?.favicon_url

  return (
    <div className="wl-page">
      <div className="wl-page-header">
        <h1>White Label Settings</h1>
        <p className="wl-intro">
          Choose your pool domain, business details, and assets used for your branded experience. Client portal login can use{' '}
          <strong>secureorderforms.com</strong> and the other approved domains below—point DNS at your app when you go live.
        </p>
      </div>

      <div className="wl-portal-note">
        <span>Need sub-accounts for clients?</span>
        <Link to="/sub-accounts">Manage sub-accounts</Link>
      </div>

      {error && <div className="wl-alert wl-alert-error">{error}</div>}
      {success && <div className="wl-alert wl-alert-success">{success}</div>}

      <form className="wl-form" onSubmit={handleSubmit}>
        <div className="wl-field">
          <label htmlFor="wl-tld">Top level domain</label>
          <select
            id="wl-tld"
            value={topLevelDomain}
            onChange={(e) => setTopLevelDomain(e.target.value)}
          >
            <option value="">Select a domain…</option>
            {domainSelectOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <p className="wl-hint">Use this zone in DNS when you create hostnames for your clients.</p>
        </div>

        <div className="wl-field">
          <label htmlFor="wl-business">Business name</label>
          <input
            id="wl-business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoComplete="organization"
          />
        </div>

        <div className="wl-field">
          <label htmlFor="wl-software">Software title</label>
          <input
            id="wl-software"
            value={softwareTitle}
            onChange={(e) => setSoftwareTitle(e.target.value)}
          />
        </div>

        <div className="wl-field">
          <label htmlFor="wl-address">Address</label>
          <input
            id="wl-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>

        <div className="wl-grid-2">
          <div className="wl-field">
            <label htmlFor="wl-city">City</label>
            <input id="wl-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="wl-field">
            <label htmlFor="wl-state">State</label>
            <input id="wl-state" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>

        <div className="wl-grid-2">
          <div className="wl-field">
            <label htmlFor="wl-zip">Zip / Postal code</label>
            <input id="wl-zip" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div className="wl-field">
            <label htmlFor="wl-country">Country</label>
            <input id="wl-country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        <div className="wl-upload-block">
          <label>Uploaded logo</label>
          <p className="wl-hint">Used for watermarks on posts and for white-label branding. PNG with transparency recommended.</p>
          {logoPreview ? (
            <div className="wl-preview">
              <img src={logoPreview} alt="Logo preview" />
            </div>
          ) : (
            <p className="wl-placeholder">No logo uploaded yet.</p>
          )}
          {logoError && <p className="wl-inline-error">{logoError}</p>}
          <label className="wl-file-btn">
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" onChange={handleLogoFile} disabled={logoUploading} />
            {logoUploading ? 'Uploading…' : 'Choose file'}
          </label>
        </div>

        <div className="wl-upload-block">
          <label>Uploaded favicon</label>
          <p className="wl-hint">Browser tab icon (.png, .ico, etc.).</p>
          {faviconPreview ? (
            <div className="wl-preview wl-preview-favicon">
              <img src={faviconPreview} alt="Favicon preview" />
            </div>
          ) : (
            <p className="wl-placeholder">No favicon uploaded yet.</p>
          )}
          {faviconError && <p className="wl-inline-error">{faviconError}</p>}
          <label className="wl-file-btn">
            <input type="file" accept="image/*,.ico" onChange={handleFaviconFile} disabled={faviconUploading} />
            {faviconUploading ? 'Uploading…' : 'Choose file'}
          </label>
        </div>

        <div className="wl-actions">
          <button type="submit" className="wl-btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Update White Label Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

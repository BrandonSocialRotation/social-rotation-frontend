import { useState, useEffect } from 'react'
import api from '../services/api'

export type PublicShellBranding = {
  app_name: string
  logo_url?: string
  primary_color?: string
  favicon_url?: string
}

export const DEFAULT_AUTH_APP_NAME = 'Social Rotation'

type Options = {
  /** Sets document title to `{app_name} · {suffix}` when branding loads */
  documentTitleSuffix?: string
}

/**
 * Loads public GET /client_portal/branding for the current hostname (white-label auth shell).
 */
export function usePublicClientPortalBranding(options: Options = {}) {
  const { documentTitleSuffix } = options
  const [shellBrand, setShellBrand] = useState<PublicShellBranding | null>(null)

  useEffect(() => {
    let cancelled = false
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    if (!host) return

    ;(async () => {
      try {
        const { data } = await api.get<{
          branding?: Record<string, string | undefined>
          app_name?: string
        }>('/client_portal/branding', { params: { hostname: host } })
        if (cancelled) return
        const b = data.branding || {}
        const appName =
          (typeof data.app_name === 'string' && data.app_name) ||
          (typeof b.app_name === 'string' && b.app_name) ||
          ''
        if (!appName) return
        setShellBrand({
          app_name: appName,
          logo_url: typeof b.logo_url === 'string' ? b.logo_url : undefined,
          primary_color: typeof b.primary_color === 'string' ? b.primary_color : undefined,
          favicon_url: typeof b.favicon_url === 'string' ? b.favicon_url : undefined,
        })
      } catch {
        /* unregistered hostname — keep default */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!shellBrand?.app_name || !documentTitleSuffix) return
    const prev = document.title
    document.title = `${shellBrand.app_name} · ${documentTitleSuffix}`
    return () => {
      document.title = prev
    }
  }, [shellBrand?.app_name, documentTitleSuffix])

  useEffect(() => {
    if (!shellBrand?.favicon_url) return
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = shellBrand.favicon_url
  }, [shellBrand?.favicon_url])

  return { shellBrand }
}

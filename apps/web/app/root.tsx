import type { LinksFunction, MetaFunction } from "react-router"
import { LockKeyhole, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Links, Meta, Navigate, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router"
import { ThemeProvider } from "./hooks/useTheme"
import { SESSION_EXPIRED_EVENT } from "./lib/api-client"
import { MEDIA_ORIGIN } from "./lib/media-assets"
import {
  ACCESS_STATUS_REFRESH_INTERVAL_MS,
  DEFAULT_PARALLELLINES_URL,
  getAccessStatus,
  PARALLELLINES_AUTH_MODE,
  type AccessStatus,
} from "./lib/session"

import "./styles.css"

export const meta: MetaFunction = () => [
  { title: "FableSpace｜世界的镜像面" },
  {
    name: "description",
    content: "基于地理位置的多类型 AI 空间游玩平台。",
  },
]

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://webapi.amap.com" },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href={MEDIA_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={MEDIA_ORIGIN} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  const location = useLocation()
  const canonicalPathname = location.pathname === "/"
    ? "/"
    : location.pathname.replace(/\/+$/, "") || "/"

  if (canonicalPathname !== location.pathname) {
    return (
      <Navigate
        replace
        to={{ pathname: canonicalPathname, search: location.search, hash: location.hash }}
      />
    )
  }

  return (
    <ThemeProvider>
      <PrivateAccessGate>
        <Outlet />
      </PrivateAccessGate>
    </ThemeProvider>
  )
}

/**
 * Blocks the application tree until the backend confirms linked-mode access.
 * @param children Protected route content rendered only for an allowed session.
 * @returns Access loading, closed, unavailable, or protected route UI.
 */
function PrivateAccessGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  // Refreshes the backend gate decision; background checks keep the current tree mounted while pending.
  const refreshAccess = useCallback(async (forceRefresh = false, background = false) => {
    if (!background) {
      setLoading(true)
      setError("")
    }
    try {
      setStatus(await getAccessStatus(forceRefresh))
      setError("")
    } catch {
      if (!background) setStatus(null)
      setError("暂时无法确认私密空间状态")
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAccess()
    // Rechecks access immediately after any protected API reports an expired session.
    const handleSessionExpired = () => void refreshAccess(true)
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [refreshAccess])

  useEffect(() => {
    if (status?.auth_mode !== PARALLELLINES_AUTH_MODE) return
    const intervalId = window.setInterval(() => {
      void refreshAccess(true, true)
    }, ACCESS_STATUS_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [refreshAccess, status?.auth_mode])

  if (loading) {
    return <div className="app-loading">正在确认私密空间入口...</div>
  }
  if (error) {
    return (
      <AccessClosedPanel
        title="入口暂时没有回应"
        description={error}
        actionLabel="重新确认"
        onAction={() => void refreshAccess(true)}
      />
    )
  }
  if (!status?.access_allowed) {
    return (
      <AccessClosedPanel
        title="这扇门现在是关着的"
        description="请从 ParallelLines 左侧的私密空间入口进入。"
        actionLabel="返回 ParallelLines"
        href={status?.parallellines_url || DEFAULT_PARALLELLINES_URL}
      />
    )
  }
  return children
}

/** Render the private entrance closed/error state with one safe recovery action. */
function AccessClosedPanel({
  title,
  description,
  actionLabel,
  href,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  href?: string
  onAction?: () => void
}) {
  const actionClass = "mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--entry-primary)] px-6 text-sm font-black text-[var(--entry-primary-ink)] outline-none transition hover:bg-[var(--entry-primary-hover)] active:bg-[var(--entry-primary-active)] focus-visible:ring-4 focus-visible:ring-[var(--entry-focus)]"
  return (
    <main className="cinematic-entry relative grid min-h-screen place-items-center overflow-hidden px-5">
      <div className="cinematic-entry__ambient pointer-events-none absolute inset-0" />
      <section className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--entry-border)] bg-[var(--entry-surface-raised)] p-8 text-center backdrop-blur-xl sm:p-11">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--entry-lavender-soft)] text-[var(--entry-lavender)]">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-[var(--entry-lavender-light)]">FableSpace</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-7 text-[var(--entry-muted)]">{description}</p>
        {href ? (
          <a className={actionClass} href={href}>{actionLabel}</a>
        ) : (
          <button className={actionClass} type="button" onClick={onAction}>
            <RefreshCw className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </section>
    </main>
  )
}

export function HydrateFallback() {
  return <div className="app-loading">正在进入 FableSpace 镜像空间...</div>
}

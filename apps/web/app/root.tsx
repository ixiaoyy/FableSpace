import type { LinksFunction, MetaFunction } from "react-router"
import { Links, Meta, Navigate, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router"
import { ThemeProvider } from "./hooks/useTheme"

import "./styles.css"

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL?.trim() || ""
const ASSET_ORIGIN = ASSET_BASE_URL ? new URL(ASSET_BASE_URL).origin : ""

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
        {ASSET_ORIGIN ? <link rel="preconnect" href={ASSET_ORIGIN} crossOrigin="anonymous" /> : null}
        {ASSET_ORIGIN ? <link rel="dns-prefetch" href={ASSET_ORIGIN} /> : null}
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
      <Outlet />
    </ThemeProvider>
  )
}

export function HydrateFallback() {
  return <div className="app-loading">正在进入 FableSpace 镜像空间...</div>
}

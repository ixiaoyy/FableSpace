import type { LinksFunction, MetaFunction } from "react-router"
import { Links, Meta, Navigate, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router"
import { ThemeProvider } from "./hooks/useTheme"
import { MEDIA_ORIGIN } from "./lib/media-assets"

import "./styles.css"

export const meta: MetaFunction = () => [
  { title: "FableSpace｜世界的镜像面" },
  {
    name: "description",
    content: "以角色、选择和长期记忆为核心的故事世界。",
  },
]

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
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
      <Outlet />
    </ThemeProvider>
  )
}

export function HydrateFallback() {
  return <div className="app-loading">正在进入 FableSpace...</div>
}

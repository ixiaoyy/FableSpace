import type { LinksFunction, MetaFunction } from "react-router"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"
import { ThemeProvider } from "./hooks/useTheme"

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
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}

export function HydrateFallback() {
  return <div className="app-loading">正在进入 FableSpace 镜像空间...</div>
}

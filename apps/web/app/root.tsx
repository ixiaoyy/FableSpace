import type { LinksFunction, MetaFunction } from "react-router"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import stylesheetUrl from "./styles.css?url"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheetUrl },
]

export const meta: MetaFunction = () => [
  { title: "苔野小屋" },
  { name: "description", content: "一个打开即玩的俯视角像素农场生活游戏。" },
]

/** Render the minimal browser document used by the independent Phaser game. */
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

/** Render the only public game route. */
export default function Root() {
  return <Outlet />
}

/** Keep the static SPA handoff visually consistent while the client bundle hydrates. */
export function HydrateFallback() {
  return <div className="gameBoot">正在推开院门…</div>
}

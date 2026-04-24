import { MapPinned, Sparkles } from "lucide-react"
import { NavLink } from "react-router"

import { cn } from "../lib/utils"

const navItems = [
  { to: "/", label: "首页" },
  { to: "/discover", label: "发现" },
  { to: "/create", label: "开店" },
]

export function ProductShell({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030512] text-violet-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(217,70,239,0.16),transparent_28rem),radial-gradient(circle_at_86%_14%,rgba(0,214,201,0.14),transparent_30rem),linear-gradient(180deg,rgba(3,5,18,0),rgba(3,5,18,0.92))]" />
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050615]/90 backdrop-blur-xl" aria-label="FableMap navigation">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <NavLink to="/" end className="flex w-fit items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/8 text-sm font-black text-cyan-100 shadow-[0_0_28px_rgba(0,214,201,0.18)]">
              FM
            </span>
            <div>
              <p className="font-black tracking-wide text-white">FableMap</p>
              <p className="text-xs text-violet-100/45">Cyber taverns on real places</p>
            </div>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-cyan-300/60 bg-cyan-300/15 text-white shadow-[0_0_28px_rgba(0,214,201,0.18)]"
                      : "border-white/10 bg-white/[0.045] text-violet-100/70 hover:border-white/18 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-[1320px] px-6 py-10 sm:py-12">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        {children}
        <footer className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-violet-100/45 sm:flex-row sm:items-center">
          <MapPinned className="h-4 w-4 text-cyan-100/60" />
          <span>Real coordinate anchored. Owner-authored. AI-powered tavern experience.</span>
        </footer>
      </div>
    </main>
  )
}

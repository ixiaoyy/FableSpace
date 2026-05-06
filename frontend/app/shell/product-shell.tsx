import { ClipboardList, Compass, Home, MapPinned, PlusCircle, Sparkles, UserRound } from "lucide-react"
import { NavLink } from "react-router"

import { cn } from "../lib/utils"

// Bottom dock order: visitor-first mainline = 首页 / 发现 / 进店 / 清单 / 管理
// 桌面顶部保留“创建空间”；移动底部只暴露访客主线标签，避免把店主创建挤进第一屏。
const bottomDockOrder = [
  { to: "/", label: "首页", icon: Home },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "/create", label: "进店", icon: PlusCircle },
  { to: "/quests", label: "清单", icon: ClipboardList },
  { to: "/owner", label: "管理", icon: UserRound },
]

// 顶部导航保留完整功能，不做降级
const topNavItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "/quests", label: "清单", icon: ClipboardList },
  { to: "/create", label: "创建空间", icon: PlusCircle },
  { to: "/owner", label: "管理入口", icon: UserRound },
]

const MOBILE_CRITICAL_FLOW_GUIDES: Record<string, {
  title: string
  helper: string
  primaryLabel: string
  href: string
}> = {
  Discover: {
    title: "先找到一个可进入的坐标",
    helper: "移动首屏只保留搜索、筛选、预览入店这一条主线，更多面板往下看。",
    primaryLabel: "查看发现主线",
    href: "#discover-mainline",
  },
  Checklist: {
    title: "先选一个安全探索项目",
    helper: "探索清单只做完成记录、文字纪念章和回访提示，不做等级、装备或排名。",
    primaryLabel: "查看探索清单",
    href: "#checklist-mainline",
  },
  Create: {
    title: "先钉真实坐标，再填内容",
    helper: "移动端优先完成坐标、名称、首个 NPC；AI 草稿始终等店主确认。",
    primaryLabel: "开始创建主线",
    href: "#create-mainline",
  },
  Tavern: {
    title: "先选 NPC，直接开聊",
    helper: "移动首屏聚焦角色列表和聊天输入；酒馆资料与公开功能折叠在下方，配置/审批进入专用管理页，不把高级管理挤进第一屏。",
    primaryLabel: "进入聊天主线",
    href: "#tavern-mainline",
  },
  Owner: {
    title: "先处理一个店主待办",
    helper: "移动端先看经营摘要、通知和下一步建议，再展开图表与明细。",
    primaryLabel: "查看店主主线",
    href: "#owner-mainline",
  },
}

export function ProductShell({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  const mobileGuide = MOBILE_CRITICAL_FLOW_GUIDES[eyebrow]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030512] text-violet-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(217,70,239,0.16),transparent_28rem),radial-gradient(circle_at_86%_14%,rgba(0,214,201,0.14),transparent_30rem),linear-gradient(180deg,rgba(3,5,18,0),rgba(3,5,18,0.92))]" />
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050615]/90 backdrop-blur-xl" aria-label="FableMap navigation">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <NavLink to="/" end className="flex min-h-11 w-fit touch-manipulation items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/8 text-sm font-black text-cyan-100 shadow-[0_0_28px_rgba(0,214,201,0.18)]">
              FM
            </span>
            <div>
              <p className="font-black tracking-wide text-white">FableMap</p>
              <p className="text-xs text-violet-100/45">Cyber life on real coordinates</p>
            </div>
          </NavLink>
          <nav className="-mx-1 hidden max-w-full flex-wrap items-center gap-2 overflow-x-auto px-1 pb-1 lg:flex" aria-label="Primary navigation">
            {topNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-11 touch-manipulation items-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-cyan-300/60 bg-cyan-300/15 text-white shadow-[0_0_28px_rgba(0,214,201,0.18)]"
                      : "border-white/10 bg-white/[0.045] text-violet-100/70 hover:border-white/18 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <item.icon className="mr-2 hidden h-4 w-4 sm:block" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <nav
        className="mobile-bottom-dock fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-[1.5rem] border border-white/12 bg-slate-950/88 p-1.5 shadow-2xl shadow-black/45 backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {bottomDockOrder.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[1.1rem] px-2 text-[0.68rem] font-bold transition",
                isActive
                  ? "bg-cyan-300/18 text-white shadow-[0_0_26px_rgba(0,214,201,0.18)]"
                  : "text-violet-100/58 hover:bg-white/8 hover:text-violet-50",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="relative mx-auto w-full max-w-[1320px] px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:pb-12">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        {mobileGuide ? (
          <section
            data-mobile-critical-flow
            className="mb-5 rounded-[1.75rem] border border-cyan-300/18 bg-cyan-300/[0.08] p-4 shadow-[0_18px_70px_rgba(34,211,238,0.08)] lg:hidden"
            aria-label="Mobile critical flow"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Mobile first-screen</p>
            <h2 className="mt-2 text-xl font-black leading-tight text-white">{mobileGuide.title}</h2>
            <p className="mt-2 text-sm leading-6 text-violet-100/66">{mobileGuide.helper}</p>
            <a
              href={mobileGuide.href}
              className="mt-4 inline-flex min-h-14 w-full touch-manipulation items-center justify-center rounded-2xl border border-cyan-300/32 bg-cyan-300/14 px-4 text-sm font-black text-cyan-50 shadow-[0_0_28px_rgba(0,214,201,0.12)]"
            >
              {mobileGuide.primaryLabel}
            </a>
          </section>
        ) : null}
        {children}
        <footer className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-violet-100/45 sm:flex-row sm:items-center">
          <MapPinned className="h-4 w-4 text-cyan-100/60" />
          <span>Real coordinate anchored. Owner-authored. AI-powered living spaces.</span>
        </footer>
      </div>
    </main>
  )
}

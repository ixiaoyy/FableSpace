import { Activity, ShieldCheck } from "lucide-react"

import type { Space } from "../lib/spaces"
import { SPACE_ACTIVITY_GUARDRAILS, buildSpaceActivityEchoes } from "../lib/space-activity-echoes.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type SpaceActivityEchoesCardProps = {
  space: Space
}

export function SpaceActivityEchoesCard({ space }: SpaceActivityEchoesCardProps) {
  const view = buildSpaceActivityEchoes(space)

  return (
    <Card className="mt-6 overflow-hidden border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              Activity without social graph
            </div>
            <CardTitle>空间活跃摘要</CardTitle>
            <CardDescription className="mt-2">
              用街区传闻和聚合活动摘要表现这里的生活痕迹，但不展示访客身份、聊天记录或公开社交关系。
            </CardDescription>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            {view.level.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-violet-100/66">
          {view.level.helper}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {view.echoes.map((echo) => (
            <article key={echo.id} className="min-h-32 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">{echo.label}</p>
              <p className="mt-3 text-2xl font-black text-white">{echo.value}</p>
              <p className="mt-2 text-xs leading-5 text-violet-100/56">{echo.helper}</p>
            </article>
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="空间活性边界">
          {SPACE_ACTIVITY_GUARDRAILS.map((item) => (
            <li key={item} className="rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.07] px-3 py-2 text-sm font-bold text-emerald-50">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

"""
Neighborhood Rumor Bubble Component — 邻里传闻气泡组件

显示 NPC 分享的关于其他酒馆的传闻。
"""

import { Compass, MapPin } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import {
  type NeighborhoodRumor,
  listRumors,
  recordRumorClick,
  recordRumorView,
} from "../lib/taverns"

type RumorBubbleProps = {
  tavernId: string
  limit?: number
  onNavigate?: (targetTavernId: string) => void
}

function formatTime(dateStr: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr.replace("Z", "+00:00"))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "刚刚"
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
}

function RumorCard({
  rumor,
  onNavigate,
}: {
  rumor: NeighborhoodRumor
  onNavigate?: (targetTavernId: string) => void
}) {
  async function handleClick() {
    // 记录点击
    try {
      await recordRumorClick(rumor.id)
    } catch (e) {
      // 忽略错误
    }
    // 触发跳转
    if (onNavigate) {
      onNavigate(rumor.target_tavern_id)
    } else {
      // 默认行为：导航到目标酒馆
      window.location.href = `/tavern/${encodeURIComponent(rumor.target_tavern_id)}`
    }
  }

  return (
    <div className="group cursor-pointer rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/10 to-orange-300/10 p-4 transition-all hover:border-amber-300/40 hover:from-amber-300/15 hover:to-orange-300/15">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10">
          <Compass className="h-5 w-5 text-amber-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-amber-100">{rumor.character_name} 说</span>
            <span className="text-xs text-violet-100/40">{formatTime(rumor.created_at)}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-violet-50/80">{rumor.rumor_text}</p>
          <button
            onClick={handleClick}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-300/20"
          >
            <MapPin className="h-3 w-3" />
            去看看「{rumor.target_tavern_name}」
          </button>
        </div>
      </div>
    </div>
  )
}

export function NeighborhoodRumorBubble({ tavernId, limit = 3, onNavigate }: RumorBubbleProps) {
  const [rumors, setRumors] = useState<NeighborhoodRumor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadRumors() {
      setLoading(true)
      setError("")
      try {
        const result = await listRumors({ source_tavern_id: tavernId, limit })
        setRumors(result.rumors)

        // 记录浏览
        for (const rumor of result.rumors) {
          try {
            await recordRumorView(rumor.id)
          } catch (e) {
            // 忽略错误
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载传闻失败")
      } finally {
        setLoading(false)
      }
    }

    loadRumors()
  }, [tavernId, limit])

  const handleNavigate = useCallback(
    (targetTavernId: string) => {
      if (onNavigate) {
        onNavigate(targetTavernId)
      } else {
        window.location.href = `/tavern/${encodeURIComponent(targetTavernId)}`
      }
    },
    [onNavigate],
  )

  const visibleRumors = rumors.filter((r) => !dismissed.has(r.id))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-violet-100/50">
          <Compass className="h-4 w-4" />
          <span>邻里传闻</span>
        </div>
        <div className="grid min-h-24 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <span className="text-sm text-violet-100/40">加载传闻中...</span>
        </div>
      </div>
    )
  }

  if (error || visibleRumors.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-amber-100/60">
        <Compass className="h-4 w-4" />
        <span>邻里传闻</span>
      </div>
      <div className="space-y-2">
        {visibleRumors.map((rumor) => (
          <RumorCard key={rumor.id} rumor={rumor} onNavigate={handleNavigate} />
        ))}
      </div>
    </div>
  )
}

import { useState } from "react"
import type { PeakDay } from "../lib/spaces"

type TokenUsageChartProps = {
  peakDays: PeakDay[]
  totalTokens: number
}

const TIME_RANGES = [
  { label: "7天", days: 7 },
  { label: "14天", days: 14 },
  { label: "30天", days: 30 },
] as const

export function TokenUsageChart({ peakDays, totalTokens }: TokenUsageChartProps) {
  const [selectedRange, setSelectedRange] = useState<(typeof TIME_RANGES)[number]>(TIME_RANGES[0])

  const filteredDays = peakDays.slice(0, selectedRange.days)
  const maxCount = Math.max(...filteredDays.map((d) => d.visit_count), 1)

  const formatTokens = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return String(count)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
  }

  if (!peakDays || peakDays.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-cyan-100">消息量趋势</h4>
        </div>
        <div className="flex h-32 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <p className="text-sm text-violet-100/60">暂无数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-cyan-100">消息量趋势</h4>
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                selectedRange.label === range.label
                  ? "bg-cyan-300/20 text-cyan-100"
                  : "text-violet-100/60 hover:bg-white/5"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-32 items-end gap-1">
        {filteredDays.map((day, index) => {
          const heightPercent = (day.visit_count / maxCount) * 100
          const isToday = index === filteredDays.length - 1

          return (
            <div key={day.date} className="group relative flex flex-1 flex-col items-center">
              <div
                className={`w-full rounded-t transition-all hover:opacity-80 ${
                  isToday ? "bg-fuchsia-400/70" : "bg-cyan-400/60"
                }`}
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              />
              <div className="mt-1 text-center">
                <span className="text-[10px] text-violet-100/50">{formatDate(day.date)}</span>
              </div>
              <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {day.visit_count} 条
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-violet-100/50">
        <span>总计: {formatTokens(totalTokens)} 条消息</span>
        <span>峰值: {formatTokens(maxCount)} 条/天</span>
      </div>
    </div>
  )
}

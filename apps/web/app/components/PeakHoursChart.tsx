type PeakHoursChartProps = {
  peakHours: number[]
  sessions?: { updated_at?: string; message_count?: number }[]
}

const HOUR_LABELS = [
  "00", "01", "02", "03", "04", "05",
  "06", "07", "08", "09", "10", "11",
  "12", "13", "14", "15", "16", "17",
  "18", "19", "20", "21", "22", "23",
]

const TIME_CATEGORIES = [
  { hours: [0, 1, 2, 3, 4, 5], label: "深夜", color: "bg-slate-400/40" },
  { hours: [6, 7, 8, 9, 10, 11], label: "上午", color: "bg-amber-400/50" },
  { hours: [12, 13, 14, 15, 16, 17], label: "下午", color: "bg-orange-400/50" },
  { hours: [18, 19, 20, 21, 22, 23], label: "晚间", color: "bg-fuchsia-400/50" },
]

function computeHourlyCounts(sessions: PeakHoursChartProps["sessions"]) {
  const counts = new Array(24).fill(0)
  if (!sessions) return counts

  for (const session of sessions) {
    const updatedAt = session.updated_at
    if (!updatedAt) continue

    try {
      const dt = new Date(updatedAt.replace("Z", "+00:00"))
      const hour = dt.getHours()
      counts[hour] += session.message_count || 0
    } catch {
      // Skip invalid timestamps
    }
  }
  return counts
}

function getCategoryStats(hourCounts: number[]) {
  return TIME_CATEGORIES.map((cat) => {
    const total = cat.hours.reduce((sum, h) => sum + hourCounts[h], 0)
    return { ...cat, total }
  })
}

export function PeakHoursChart({ peakHours, sessions = [] }: PeakHoursChartProps) {
  const hourCounts = computeHourlyCounts(sessions)
  const maxCount = Math.max(...hourCounts, 1)
  const categoryStats = getCategoryStats(hourCounts)

  const getBarColor = (hour: number) => {
    const isPeak = peakHours.includes(hour)
    if (isPeak) return "bg-fuchsia-400/70"

    const category = TIME_CATEGORIES.find((c) => c.hours.includes(hour))
    if (category?.label === "深夜") return "bg-slate-400/40"
    if (category?.label === "上午") return "bg-amber-400/50"
    if (category?.label === "下午") return "bg-orange-400/50"
    if (category?.label === "晚间") return "bg-fuchsia-400/50"
    return "bg-cyan-400/40"
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "凌晨"
    if (hour === 6) return "早晨"
    if (hour === 12) return "中午"
    if (hour === 18) return "傍晚"
    return `${hour}:00`
  }

  const bestCategory = categoryStats.reduce(
    (best, cat) => (cat.total > best.total ? cat : best),
    categoryStats[0],
  )

  if (!peakHours || peakHours.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-cyan-100">热门时段</h4>
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
        <h4 className="text-sm font-semibold text-cyan-100">热门时段</h4>
        <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-2 py-1 text-xs text-fuchsia-100">
          峰值: {peakHours.map((h) => `${h}:00`).join(", ")}
        </span>
      </div>

      {/* 24-hour bar chart */}
      <div className="flex h-16 items-end gap-[2px]">
        {HOUR_LABELS.map((label, index) => {
          const heightPercent = (hourCounts[index] / maxCount) * 100
          const isPeak = peakHours.includes(index)

          return (
            <div
              key={label}
              className={`group relative flex flex-1 flex-col items-center transition-all ${
                isPeak ? "z-10" : ""
              }`}
            >
              <div
                className={`w-full rounded-t transition-all hover:opacity-80 ${getBarColor(index)}`}
                style={{ height: `${Math.max(heightPercent, 8)}%` }}
              />
              {isPeak && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-fuchsia-500 px-1 text-[10px] text-white">
                  {formatHour(index)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time period labels */}
      <div className="flex justify-between text-[10px] text-violet-100/50">
        <span>0时</span>
        <span>6时</span>
        <span>12时</span>
        <span>18时</span>
        <span>24时</span>
      </div>

      {/* Category summary */}
      <div className="grid grid-cols-2 gap-2">
        {categoryStats.map((cat) => {
          const isBest = cat.label === bestCategory.label
          return (
            <div
              key={cat.label}
              className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                isBest ? "border border-fuchsia-300/30 bg-fuchsia-300/10" : "bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${cat.color}`} />
                <span className={`text-xs ${isBest ? "text-fuchsia-100" : "text-violet-100/70"}`}>
                  {cat.label}
                </span>
              </div>
              <span className={`text-xs font-medium ${isBest ? "text-fuchsia-200" : "text-violet-100/50"}`}>
                {cat.total} 条
              </span>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3">
        <p className="text-xs text-cyan-100/80">
          <span className="font-semibold">建议营业时间</span>：{bestCategory.label} ({bestCategory.hours[0]}:00 -{" "}
          {bestCategory.hours[bestCategory.hours.length - 1] + 1}:00)
        </p>
      </div>
    </div>
  )
}
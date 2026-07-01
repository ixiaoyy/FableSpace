/**
 * EngagementHUD
 *
 * Compact coin wallet + voucher badge shown in the space header.
 * Shows balance, daily earnings progress, and voucher count.
 */

import { useEffect, useState } from "react"
import { getVisitorEngagement, type VisitorEngagement } from "../lib/engagement"

type EngagementHUDProps = {
  spaceId: string
  userId?: string
  coinLabel?: string
}

export function EngagementHUD({ spaceId, userId = "", coinLabel = "纪念币" }: EngagementHUDProps) {
  const [data, setData] = useState<VisitorEngagement | null>(null)

  useEffect(() => {
    getVisitorEngagement(spaceId, userId)
      .then(setData)
      .catch(() => setData(null))
  }, [spaceId, userId])

  // Show only when data is loaded
  if (!data) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {/* Coin balance */}
      <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1">
        <span className="text-sm" aria-hidden="true">🪙</span>
        <span className="text-sm font-bold text-amber-300">
          {data.wallet.balance}
        </span>
        <span className="text-xs text-amber-100/56">{coinLabel}</span>
      </div>

      {/* Daily earn progress */}
      {data.daily_earned > 0 && (
        <div className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1">
          <span className="text-xs" aria-hidden="true">📈</span>
          <span className="text-xs font-semibold text-emerald-100/72">
            +{data.daily_earned}
          </span>
        </div>
      )}

      {/* Voucher count */}
      {data.vouchers_available > 0 && (
        <div
          className="flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/12 px-2.5 py-1"
          title={`${data.vouchers_available} 张抽奖券`}
        >
          <span className="text-xs" aria-hidden="true">🎰</span>
          <span className="text-xs font-bold text-violet-200">{data.vouchers_available}</span>
        </div>
      )}
    </div>
  )
}

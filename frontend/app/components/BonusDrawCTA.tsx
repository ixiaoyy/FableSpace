/**
 * BonusDrawCTA
 *
 * Allows visitors to redeem coins for bonus draw vouchers.
 * Shows the CTA, voucher price, and redeem result.
 */

import { useState } from "react"
import { redeemVoucher, type RedeemVoucherResult } from "../lib/engagement"

type BonusDrawCTAProps = {
  spaceId: string
  userId?: string
  balance: number
  coinLabel: string
  voucherPrice: number
  vouchersAvailable: number
  enabled: boolean
  onRedeemed?: (result: RedeemVoucherResult) => void
}

export function BonusDrawCTA({
  spaceId,
  userId = "",
  balance,
  coinLabel,
  voucherPrice,
  vouchersAvailable,
  enabled,
  onRedeemed,
}: BonusDrawCTAProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const canAfford = balance >= voucherPrice

  async function handleRedeem() {
    if (!canAfford || !enabled) return
    setLoading(true)
    setResult(null)
    try {
      const res = await redeemVoucher(spaceId, userId)
      if (res.success) {
        setResult({ type: "success", text: `获得 1 张抽奖券！剩余：${res.vouchers_remaining}` })
        onRedeemed?.(res)
      } else {
        setResult({ type: "error", text: res.reason })
      }
    } catch (err) {
      setResult({ type: "error", text: String(err) })
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-violet-400/12 bg-violet-400/6 p-4">
        <p className="text-sm text-white/40">本空间暂不支持抽奖券功能</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🎰</span>
          <div>
            <p className="text-sm font-bold text-white">抽奖券商店</p>
            <p className="text-xs text-white/40">
              已有 {vouchersAvailable} 张可用
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between rounded-2xl border border-violet-400/20 bg-violet-400/8 p-4">
        <div>
          <p className="text-sm font-bold text-white">消耗 🪙 {voucherPrice} {coinLabel}</p>
          <p className="mt-0.5 text-xs text-white/48">兑换 1 张抽奖券</p>
        </div>
        <button
          type="button"
          disabled={!canAfford || loading}
          onClick={handleRedeem}
          className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition ${
            canAfford && !loading
              ? "border-violet-400/50 bg-violet-400/14 text-violet-200 hover:border-violet-400/80 hover:bg-violet-400/24 hover:text-violet-100"
              : "cursor-not-allowed border-white/8 bg-white/[0.04] text-white/32"
          }`}
        >
          {loading ? "兑换中…" : "立即兑换"}
        </button>
      </div>

      {/* Result message */}
      {result && (
        <div className={`rounded-xl border px-4 py-2 text-sm ${
          result.type === "success"
            ? "border-emerald-400/30 bg-emerald-400/8 text-emerald-200"
            : "border-red-400/30 bg-red-400/8 text-red-200"
        }`}>
          {result.text}
        </div>
      )}
    </div>
  )
}

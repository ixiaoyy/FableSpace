/**
 * GiftPanel
 *
 * Shows the gift catalog and allows visitors to send gifts to NPCs.
 * Displays gifts with emoji, name, description, price, and affinity gain.
 */

import { useEffect, useState } from "react"
import { getEngagementConfig, sendGift, type EngagementConfig, type GiftCatalogItem, type SendGiftResult } from "../lib/engagement"

type GiftPanelProps = {
  spaceId: string
  userId?: string
  characterId: string
  characterName: string
  balance: number
  coinLabel: string
  onGiftSent?: (result: SendGiftResult) => void
}

function GiftCard({
  gift,
  canAfford,
  coinLabel,
  onSend,
  sending,
}: {
  gift: GiftCatalogItem
  canAfford: boolean
  coinLabel: string
  onSend: () => void
  sending: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-400/20 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{gift.emoji}</span>
          <div>
            <p className="text-sm font-bold text-white">{gift.name}</p>
            <p className="mt-0.5 text-xs text-white/48">{gift.description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-amber-300">🪙 {gift.price}</p>
          <p className="mt-0.5 text-xs text-emerald-200/62">+{gift.affinity_delta} 好感</p>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAfford || sending}
        onClick={onSend}
        className={`w-full rounded-xl border px-4 py-2 text-sm font-bold transition ${
          canAfford && !sending
            ? "border-amber-400/40 bg-amber-400/12 text-amber-200 hover:border-amber-400/70 hover:bg-amber-400/20 hover:text-amber-100"
            : "cursor-not-allowed border-white/8 bg-white/[0.04] text-white/32"
        }`}
      >
        {sending ? "发送中…" : canAfford ? "送给对方" : `余额不足（需 ${gift.price} ${coinLabel}）`}
      </button>
    </div>
  )
}

export function GiftPanel({ spaceId, userId = "", characterId, characterName, balance, coinLabel, onGiftSent }: GiftPanelProps) {
  const [config, setConfig] = useState<EngagementConfig | null>(null)
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    getEngagementConfig(spaceId, userId)
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [spaceId, userId])

  async function handleSendGift(giftId: string) {
    setSendingGiftId(giftId)
    setResultMsg(null)
    try {
      const result = await sendGift(spaceId, characterId, giftId, userId)
      if (result.success) {
        setResultMsg({ type: "success", text: result.narration || `${result.gift_id} 已送出！好感 +${result.affinity_delta}` })
        onGiftSent?.(result)
      } else {
        setResultMsg({ type: "error", text: result.reason })
      }
    } catch (err) {
      setResultMsg({ type: "error", text: String(err) })
    } finally {
      setSendingGiftId(null)
    }
  }

  if (!config) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/40">加载礼品目录中…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-black text-white/80">🎁 送给 {characterName}</p>
        <p className="mt-0.5 text-xs text-white/40">当前余额：🪙 {balance} {coinLabel}</p>
      </div>

      {resultMsg && (
        <div className={`rounded-xl border px-4 py-2 text-sm ${resultMsg.type === "success"
            ? "border-emerald-400/30 bg-emerald-400/8 text-emerald-200"
            : "border-red-400/30 bg-red-400/8 text-red-200"
          }`}>
          {resultMsg.text}
        </div>
      )}

      <div className="space-y-3">
        {config.gift_catalog.map((gift) => (
          <GiftCard
            key={gift.id}
            gift={gift}
            canAfford={balance >= gift.price}
            coinLabel={coinLabel}
            onSend={() => handleSendGift(gift.id)}
            sending={sendingGiftId === gift.id}
          />
        ))}
      </div>
    </div>
  )
}

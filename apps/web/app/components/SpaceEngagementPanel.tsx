import { Coins, Gift, RefreshCcw, Ticket } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { EngagementConfig, RedeemVoucherResult, SendGiftResult, VisitorEngagement } from "../lib/engagement"
import { getEngagementConfig, getVisitorEngagement } from "../lib/engagement"
import type { Space } from "../lib/spaces"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { BonusDrawCTA } from "./BonusDrawCTA"
import { GiftPanel } from "./GiftPanel"

type SpaceEngagementPanelProps = {
  space: Space
  currentUserId: string
}

export function SpaceEngagementPanel({ space, currentUserId }: SpaceEngagementPanelProps) {
  const characters = useMemo(() => (Array.isArray(space.characters) ? space.characters : []), [space.characters])
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => characters[0]?.id || "")
  const [config, setConfig] = useState<EngagementConfig | null>(null)
  const [progress, setProgress] = useState<VisitorEngagement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId],
  )

  useEffect(() => {
    if (!selectedCharacterId && characters[0]?.id) {
      setSelectedCharacterId(characters[0].id)
      return
    }
    if (selectedCharacterId && !characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0]?.id || "")
    }
  }, [characters, selectedCharacterId])

  async function loadPanel() {
    setLoading(true)
    setError("")
    try {
      const [nextConfig, nextProgress] = await Promise.all([
        getEngagementConfig(space.id, currentUserId),
        getVisitorEngagement(space.id, currentUserId),
      ])
      setConfig(nextConfig)
      setProgress(nextProgress)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPanel()
  }, [space.id, currentUserId])

  function handleGiftSent(_result: SendGiftResult) {
    void loadPanel()
  }

  function handleVoucherRedeemed(_result: RedeemVoucherResult) {
    void loadPanel()
  }

  const coinLabel = config?.coin_label || progress?.coin_label || "纪念币"
  const balance = progress?.wallet?.balance || 0
  const vouchersAvailable = progress?.vouchers_available || 0
  const dailyEarned = progress?.daily_earned || 0

  return (
    <Card data-engagement-panel className="min-w-0 overflow-hidden border-amber-300/18 bg-amber-300/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-300" />
              空间纪念币与礼物
            </CardTitle>
            <CardDescription className="mt-2">
              这是本空间内的非充值纪念币：只能在当前空间里使用，不能提现、转让或跨空间流通。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadPanel()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/72">余额</p>
            <p className="mt-2 text-2xl font-black text-amber-200">{balance}</p>
            <p className="mt-1 text-xs text-amber-100/64">{coinLabel}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/22 bg-emerald-400/8 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/72">今日已获得</p>
            <p className="mt-2 text-2xl font-black text-emerald-200">{dailyEarned}</p>
            <p className="mt-1 text-xs text-emerald-100/64">完成玩法后可领取</p>
          </div>
          <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/72">抽奖券</p>
            <p className="mt-2 text-2xl font-black text-violet-200">{vouchersAvailable}</p>
            <p className="mt-1 text-xs text-violet-100/64">本空间可用</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-violet-50/72">
          <p className="font-bold text-theme-primary">当前可做什么</p>
          <ul className="mt-2 space-y-2">
            <li className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>完成店主已发布的玩法后，可领取本空间纪念币。</span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>纪念币可购买店主已确认的礼物，送给当前 NPC，推动轻量好感反馈。</span>
            </li>
            <li className="flex items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <span>满足额度后，还可以把纪念币兑换成额外抽奖券；这不是付费补抽。</span>
            </li>
          </ul>
        </div>

        {loading && !config && !progress ? (
          <p className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm text-violet-50/64">正在同步纪念币与礼物信息…</p>
        ) : null}

        {selectedCharacter ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-black text-white">选择送礼对象</p>
              <p className="mt-1 text-xs text-violet-100/54">礼物目录由店主配置；平台不会自动替空间发布礼物内容。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => {
                const active = character.id === selectedCharacter.id
                return (
                  <button
                    key={character.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "border-amber-400/60 bg-amber-400/14 text-amber-100"
                        : "border-white/12 bg-white/[0.04] text-violet-50/72 hover:border-amber-400/30 hover:text-white"
                    }`}
                  >
                    {character.name || character.id}
                  </button>
                )
              })}
            </div>
            <GiftPanel
              spaceId={space.id}
              userId={currentUserId}
              characterId={selectedCharacter.id}
              characterName={selectedCharacter.name || selectedCharacter.id}
              balance={balance}
              coinLabel={coinLabel}
              onGiftSent={handleGiftSent}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm text-violet-50/64">
            这间空间还没有可送礼的 NPC。店主添加角色后，这里会开放礼物互动。
          </div>
        )}

        <BonusDrawCTA
          spaceId={space.id}
          userId={currentUserId}
          balance={balance}
          coinLabel={coinLabel}
          voucherPrice={config?.bonus_draw?.voucher_price || 30}
          vouchersAvailable={vouchersAvailable}
          enabled={Boolean(config?.bonus_draw?.enabled)}
          onRedeemed={handleVoucherRedeemed}
        />
      </CardContent>
    </Card>
  )
}

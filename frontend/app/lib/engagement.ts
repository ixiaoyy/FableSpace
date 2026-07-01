/**
 * Engagement API client — wallet, gifts, and bonus draw vouchers.
 */

import { jsonInit, readApiJson } from "./api-client"


// ─── Types ──────────────────────────────────────────────────────────────────────


export type CoinWallet = {
  balance: number
  lifetime_earned: number
  lifetime_spent: number
}

export type BonusDrawVoucher = {
  id: string
  issued_at: string
  redeemed?: boolean
}

export type VisitorEngagement = {
  coin_label: string
  wallet: CoinWallet
  vouchers_available: number
  daily_earned: number
}

export type EngagementConfig = {
  coin_label: string
  gift_catalog: GiftCatalogItem[]
  bonus_draw: {
    enabled: boolean
    voucher_price: number
    daily_limit: number
  }
}

export type GiftCatalogItem = {
  id: string
  name: string
  description: string
  price: number
  affinity_delta: number
  cooldown_hours: number
  emoji: string
}

export type EarnCoinsResult = {
  success: boolean
  amount: number
  reason: string
  balance: number
}

export type SendGiftResult = {
  success: boolean
  gift_id: string
  character_id: string
  amount: number
  affinity_delta: number
  cap_applied: boolean
  reason: string
  narration: string
  balance: number
}

export type RedeemVoucherResult = {
  success: boolean
  voucher_id: string
  reason: string
  vouchers_remaining: number
  balance: number
}


// ─── API functions ───────────────────────────────────────────────────────────────


type RawEngagementConfig = Omit<EngagementConfig, "gift_catalog"> & {
  gift_catalog?: Array<{
    id?: string
    name?: string
    description?: string
    price?: number
    affinity_delta?: number
    cooldown_hours?: number
    emoji?: string
    icon?: string
  }>
}

function normalizeGiftCatalogItem(value: RawEngagementConfig["gift_catalog"][number]): GiftCatalogItem {
  return {
    id: String(value?.id || ""),
    name: String(value?.name || "未命名礼物"),
    description: String(value?.description || "店主确认的空间礼物。"),
    price: Number(value?.price || 0),
    affinity_delta: Number(value?.affinity_delta || 0),
    cooldown_hours: Number(value?.cooldown_hours || 0),
    emoji: String(value?.emoji || value?.icon || "🎁"),
  }
}

function normalizeEngagementConfig(value: RawEngagementConfig): EngagementConfig {
  return {
    coin_label: String(value?.coin_label || "纪念币"),
    gift_catalog: Array.isArray(value?.gift_catalog) ? value.gift_catalog.map(normalizeGiftCatalogItem) : [],
    bonus_draw: {
      enabled: Boolean(value?.bonus_draw?.enabled),
      voucher_price: Number(value?.bonus_draw?.voucher_price || 0),
      daily_limit: Number(value?.bonus_draw?.daily_limit || 0),
    },
  }
}

export async function getVisitorEngagement(spaceId: string, userId = ""): Promise<VisitorEngagement> {
  return readApiJson<VisitorEngagement>(`/api/v1/spaces/${spaceId}/engagement/me`, { userId })
}


export async function getEngagementConfig(spaceId: string, userId = ""): Promise<EngagementConfig> {
  const payload = await readApiJson<RawEngagementConfig>(`/api/v1/spaces/${spaceId}/engagement/config`, { userId })
  return normalizeEngagementConfig(payload)
}


export async function claimEngagementReward(spaceId: string, sessionId: string, userId = ""): Promise<EarnCoinsResult> {
  return readApiJson<EarnCoinsResult>(
    `/api/v1/spaces/${spaceId}/engagement/claim-reward`,
    jsonInit("POST", { session_id: sessionId }, userId),
  )
}


export async function sendGift(spaceId: string, characterId: string, giftId: string, userId = ""): Promise<SendGiftResult> {
  return readApiJson<SendGiftResult>(
    `/api/v1/spaces/${spaceId}/engagement/gifts/send`,
    jsonInit("POST", { gift_id: giftId, character_id: characterId }, userId),
  )
}


export async function redeemVoucher(spaceId: string, userId = ""): Promise<RedeemVoucherResult> {
  return readApiJson<RedeemVoucherResult>(
    `/api/v1/spaces/${spaceId}/engagement/vouchers/redeem`,
    jsonInit("POST", {}, userId),
  )
}

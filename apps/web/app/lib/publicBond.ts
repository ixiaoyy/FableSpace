/**
 * NPC 公开关系（Public Bond）API 客户端
 */

import { readApiJson, jsonInit } from "./api-client"

type ApiInit = RequestInit & {
  userId?: string
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PublicBondType {
  value: string
  name_zh: string
  name_en: string
  is_exclusive: boolean
  description_zh: string
  description_en: string
}

export interface PublicBond {
  id: string
  character_id: string
  visitor_id: string
  bond_type: string
  status: string
  visitor_note?: string
  owner_note?: string
  revoke_reason?: string
  created_at: string
  approved_at?: string
  revoked_at?: string
  expired_at?: string
}

export interface PublicBondQueue {
  id: string
  space_id: string
  character_id: string
  visitor_id: string
  bond_type: string
  position: number
  status: string
  created_at: string
  promoted_at?: string
}

export interface VisitorBondStatus {
  active_bond: PublicBond | null
  pending_bond: PublicBond | null
  queue_entry: PublicBondQueue | null
  can_apply: boolean
  reason?: string
}

export interface PublicBondsResponse {
  bonds: PublicBond[]
  count: number
}

export interface PublicBondTypesResponse {
  types: PublicBondType[]
  count: number
}

export interface ApplyPublicBondPayload {
  bond_type: string
  visitor_note?: string
  visitor_strength: number
  visitor_gender?: string
}

export interface BondQueueResponse {
  queue: PublicBondQueue[]
  count: number
}

export interface ApproveRejectPayload {
  owner_note?: string
}

export interface RevokePayload {
  revoke_reason?: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _path(spaceId: string, characterId: string, bondId?: string) {
  const base = `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bonds`
  return bondId ? `${base}/${bondId}` : base
}

// ─── Visitor-facing endpoints ──────────────────────────────────────────────────

export async function getVisitorBond(
  spaceId: string,
  characterId: string,
  visitorId: string,
  visitorStrength = 0,
  init?: ApiInit,
): Promise<VisitorBondStatus> {
  const params = new URLSearchParams({ visitor_id: visitorId, visitor_strength: String(visitorStrength) })
  return readApiJson<VisitorBondStatus>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bond?${params}`,
    init,
  )
}

export async function applyPublicBond(
  spaceId: string,
  characterId: string,
  payload: ApplyPublicBondPayload,
  init?: ApiInit,
): Promise<VisitorBondStatus> {
  return readApiJson<VisitorBondStatus>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bond/apply`,
    { ...jsonInit("POST", payload), ...init },
  )
}

// ─── Public endpoint (no auth needed) ────────────────────────────────────────

export async function getPublicBondsForCharacter(
  spaceId: string,
  characterId: string,
  init?: ApiInit,
): Promise<PublicBondsResponse> {
  return readApiJson<PublicBondsResponse>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bonds`,
    init,
  )
}

// ─── Owner/Admin endpoints ─────────────────────────────────────────────────────

export async function approvePublicBond(
  spaceId: string,
  characterId: string,
  bondId: string,
  payload?: ApproveRejectPayload,
  init?: ApiInit,
): Promise<PublicBond> {
  return readApiJson<PublicBond>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bonds/${bondId}/approve`,
    { ...jsonInit("POST", payload), ...init },
  )
}

export async function rejectPublicBond(
  spaceId: string,
  characterId: string,
  bondId: string,
  payload?: ApproveRejectPayload,
  init?: ApiInit,
): Promise<PublicBond> {
  return readApiJson<PublicBond>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bonds/${bondId}/reject`,
    { ...jsonInit("POST", payload), ...init },
  )
}

export async function revokePublicBond(
  spaceId: string,
  characterId: string,
  bondId: string,
  payload?: RevokePayload,
  init?: ApiInit,
): Promise<PublicBond> {
  return readApiJson<PublicBond>(
    `/api/v1/spaces/${spaceId}/characters/${characterId}/public-bonds/${bondId}/revoke`,
    { ...jsonInit("POST", payload), ...init },
  )
}

// ─── Queue endpoints ───────────────────────────────────────────────────────────

export async function getBondQueue(
  spaceId: string,
  characterId?: string,
  init?: ApiInit,
): Promise<BondQueueResponse> {
  const params = characterId ? `?character_id=${characterId}` : ""
  return readApiJson<BondQueueResponse>(
    `/api/v1/spaces/${spaceId}/public-bond-queue${params}`,
    init,
  )
}

export async function cancelQueueEntry(
  spaceId: string,
  queueId: string,
  init?: ApiInit,
): Promise<{ success: boolean }> {
  return readApiJson<{ success: boolean }>(
    `/api/v1/spaces/${spaceId}/public-bond-queue/${queueId}`,
    { ...jsonInit("DELETE"), ...init },
  )
}

// ─── Bond type definitions ────────────────────────────────────────────────────

export async function getPublicBondTypes(init?: ApiInit): Promise<PublicBondTypesResponse> {
  return readApiJson<PublicBondTypesResponse>("/api/v1/public-bond/types", init)
}

// ─── Local type display helpers ───────────────────────────────────────────────

const BOND_TYPE_META: Record<string, { name_zh: string; name_en: string; tone: string }> = {
  sweetheart: { name_zh: "恋人", name_en: "Sweetheart", tone: "rose" },
  brother: { name_zh: "结拜兄弟", name_en: "Brother", tone: "blue" },
  sister: { name_zh: "结拜姐妹", name_en: "Sister", tone: "pink" },
  best_friend: { name_zh: "挚友", name_en: "Best Friend", tone: "violet" },
  confidant: { name_zh: "知己", name_en: "Confidant", tone: "violet" },
  male_confidant: { name_zh: "蓝颜知己", name_en: "Male Confidant", tone: "indigo" },
  sibling_younger: { name_zh: "义弟/妹", name_en: "Sworn Younger Sibling", tone: "cyan" },
  sibling_older: { name_zh: "义兄/姐", name_en: "Sworn Older Sibling", tone: "teal" },
  sworn_sibling: { name_zh: "结拜兄妹", name_en: "Sworn Sibling", tone: "sky" },
  master: { name_zh: "师徒", name_en: "Master", tone: "amber" },
  junior_sister: { name_zh: "师姐", name_en: "Junior Sister", tone: "pink" },
  junior_brother: { name_zh: "师弟", name_en: "Junior Brother", tone: "blue" },
  disciple_sister: { name_zh: "徒弟（女）", name_en: "Disciple Sister", tone: "rose" },
  disciple_brother: { name_zh: "徒弟（男）", name_en: "Disciple Brother", tone: "orange" },
  guardian: { name_zh: "监护人", name_en: "Guardian", tone: "slate" },
  contract_beast: { name_zh: "契约灵兽", name_en: "Contract Beast", tone: "emerald" },
}

export function getBondTypeMeta(bondType: string): { name_zh: string; name_en: string; tone: string } {
  return BOND_TYPE_META[bondType] ?? { name_zh: bondType, name_en: bondType, tone: "neutral" }
}

export const AFFINITY_TRIGGER_THRESHOLD = 0.7

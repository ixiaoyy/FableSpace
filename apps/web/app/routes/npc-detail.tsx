/**
 * NPC 关系胶囊详情页
 *
 * 路由：/空间/:spaceRef/角色/:characterRef
 *
 * 展示：
 * - NPC 大头像 / 名称 / 空间信息
 * - 好感阶段 + 进度条（AffinityProgress）
 * - TA 记得 N 件事（私有记忆计数）
 * - 结缘状态（BondBadge / 申请入口）
 * - 「开始聊天」CTA
 * - 私密记忆摘要条（折叠）
 * - 重置关系危险区（折叠）
 */

import type { ClientLoaderFunctionArgs } from "react-router"
import { useEffect, useState } from "react"
import { replace, useLoaderData, useNavigate } from "react-router"
import { MapPin, MessageCircle, ChevronDown, ChevronUp, Heart, Brain } from "lucide-react"

import { AffinityProgress } from "../components/AffinityProgress"
import { BondBadge } from "../components/BondBadge"
import { NpcRelationshipResetModal } from "../components/NpcRelationshipResetModal"
import {
  DEFAULT_VISITOR_ID,
  errorMessage,
  getSpace,
  resetNpcRelationship,
  type MemoryAtom,
  type SpaceCharacter,
  type Space,
  type VisitorRelationshipPayload,
} from "../lib/spaces"
import { getVisitorBond, type VisitorBondStatus } from "../lib/publicBond"
import { characterPath, characterSpacePath, matchesPublicReference, redirectPathForRequest } from "../lib/web-routes"
import {
  getAffinityStageMeta,
  normalizeAffinityStrength,
} from "../lib/affinity.js"
import { ProductShell } from "../shell/product-shell"
import { NpcSimulationStatusPanel } from "../features/npc-simulation-status/NpcSimulationStatusPanel"

// ─── Loader ────────────────────────────────────────────────────────────────────

type NpcDetailLoaderData = {
  spaceId: string
  characterId: string
  currentUserId: string
  space: Space | null
  character: SpaceCharacter | null
  relationship: VisitorRelationshipPayload | null
  error: string
}

function getCurrentUserIdFromRequest(request: Request): string {
  const url = new URL(request.url)
  return (
    url.searchParams.get("user_id")?.trim() ||
    url.searchParams.get("visitor_id")?.trim() ||
    DEFAULT_VISITOR_ID
  )
}

export async function clientLoader({
  params,
  request,
}: ClientLoaderFunctionArgs): Promise<NpcDetailLoaderData> {
  const spaceRef = params.spaceRef ?? ""
  const characterRef = params.characterRef ?? ""
  const currentUserId = getCurrentUserIdFromRequest(request)

  if (!spaceRef || !characterRef) {
    return {
      spaceId: "",
      characterId: "",
      currentUserId,
      space: null,
      character: null,
      relationship: null,
      error: "缺少空间或角色引用",
    }
  }

  try {
    const space = await getSpace(spaceRef, currentUserId, { view: "entry" })
    const spaceId = space.id
    const matches = (space.characters || []).filter((character) => (
      matchesPublicReference(characterRef, "character", spaceId, character.id)
    ))
    const character = matches.length === 1 ? matches[0] : null

    if (!character) {
      return {
        spaceId,
        characterId: "",
        currentUserId,
        space,
        character: null,
        relationship: null,
        error: matches.length > 1 ? "角色公开引用发生冲突" : "未找到目标角色",
      }
    }

    const characterId = character.id
    const url = new URL(request.url)
    const canonicalRoute = characterPath(space, character)
    if (url.pathname !== new URL(canonicalRoute, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalRoute))
    }

    // 访客与该空间的整体关系数据（好感 strength 在 space 返回的 visitor_state 里）
    // 此处 relationship 直接从空间 API 取（已有字段），无需额外请求
    const relationship: VisitorRelationshipPayload | null = null

    return {
      spaceId,
      characterId,
      currentUserId,
      space,
      character,
      relationship,
      error: "",
    }
  } catch (err) {
    if (err instanceof Response) throw err
    return {
      spaceId: spaceRef,
      characterId: characterRef,
      currentUserId,
      space: null,
      character: null,
      relationship: null,
      error: errorMessage(err),
    }
  }
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function NpcDetailRoute() {
  const { spaceId, characterId, currentUserId, space, character, error } =
    useLoaderData<typeof clientLoader>()
  const navigate = useNavigate()

  // Bond 状态（异步加载）
  const [bondStatus, setBondStatus] = useState<VisitorBondStatus | null>(null)
  const [bondLoading, setBondLoading] = useState(false)

  // Memory 计数（异步加载）
  const [memoryCount, setMemoryCount] = useState<number | null>(null)
  const [recentMemories, setRecentMemories] = useState<MemoryAtom[]>([])

  // 面板展开状态
  const [memoriesOpen, setMemoriesOpen] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)

  // 重置弹窗
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetResult, setResetResult] = useState<string>("")

  // 访客好感（从 space.visitor_state 取，如果后端返回了的话）
  const visitorStrength = normalizeAffinityStrength(space?.visitor_state?.relationship?.strength ?? 0)
  const visitorStage = space?.visitor_state?.relationship?.stage ?? "stranger"

  // 加载 bond 状态
  useEffect(() => {
    if (!spaceId || !characterId || !currentUserId) return
    setBondLoading(true)
    getVisitorBond(spaceId, characterId, currentUserId, visitorStrength)
      .then((data) => setBondStatus(data))
      .catch(() => setBondStatus(null))
      .finally(() => setBondLoading(false))
  }, [spaceId, characterId, currentUserId, visitorStrength])

  // 加载记忆计数
  useEffect(() => {
    if (!spaceId || !characterId || !currentUserId) return
    fetch(
      `/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms?visitor_id=${encodeURIComponent(currentUserId)}&character_id=${encodeURIComponent(characterId)}&visibility=visitor&limit=5`,
      { headers: { "X-User-Id": currentUserId } },
    )
      .then((r) => r.json())
      .then((data) => {
        setMemoryCount(data?.count ?? data?.memory_atoms?.length ?? 0)
        setRecentMemories(data?.memory_atoms ?? [])
      })
      .catch(() => {
        setMemoryCount(0)
        setRecentMemories([])
      })
  }, [spaceId, characterId, currentUserId])

  // 关系重置处理
  async function handleResetConfirm(reason: string) {
    setResetBusy(true)
    setResetResult("")
    try {
      const result = await resetNpcRelationship(spaceId, characterId, reason, currentUserId)
      setShowResetModal(false)
      setResetResult(
        result.bond_revoked
          ? "已重置。你们的结缘关系也一并结束了。"
          : "已重置。你和 TA 又是陌生人了。",
      )
      setBondStatus(null)
      setMemoryCount(0)
    } catch (err) {
      setResetResult(`重置失败：${errorMessage(err)}`)
    } finally {
      setResetBusy(false)
    }
  }

  // 错误态
  if (error || !space || !character) {
    return (
      <ProductShell eyebrow="NPC">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-4xl" aria-hidden="true">🌫️</span>
          <p className="text-base font-semibold text-white">{error || "找不到这个 NPC"}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl bg-white/8 px-5 py-2.5 text-sm text-white/70 hover:bg-white/12 transition-colors"
          >
            返回
          </button>
        </div>
      </ProductShell>
    )
  }

  const affinityMeta = getAffinityStageMeta(visitorStage, visitorStrength)
  const avatarUrl = character.avatar || character.image_url || ""
  const hasActiveBond = bondStatus?.active_bond?.status === "active"
  const hasPendingBond = bondStatus?.pending_bond?.status === "pending"

  return (
    <ProductShell eyebrow="NPC">
      <div id="npc-detail-page" className="mx-auto max-w-md">
        {/* ── 顶部导航 ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0d0a1a]/80 px-4 py-3 backdrop-blur-md">
          <button
            id="npc-detail-back"
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/70 hover:bg-white/14 transition-colors"
            aria-label="返回"
          >
            ←
          </button>
          <span className="text-sm font-medium text-white/60">NPC 档案</span>
          <div className="h-9 w-9" aria-hidden="true" />
        </div>

        {/* ── NPC 大头像区 ──────────────────────────────────────────────── */}
        <div className="relative -mt-1 flex flex-col items-center px-6 pb-6 pt-8">
          {/* 背景光晕 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at center top, rgba(139,92,246,0.4) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* 头像 */}
          <div className="relative z-10 mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${character.name} 的头像`}
                className="h-24 w-24 rounded-full border-2 border-violet-400/30 object-cover shadow-lg shadow-violet-900/50"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-violet-400/30 bg-violet-900/40 text-4xl shadow-lg">
                🌟
              </div>
            )}
            {/* 在线/开放指示 */}
            {space.status === "open" && (
              <span
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#0d0a1a] bg-emerald-400"
                title="空间开放中"
                aria-label="空间开放中"
              />
            )}
          </div>

          {/* 角色名 */}
          <h1 className="z-10 text-xl font-bold text-white">{character.name}</h1>

          {/* 空间名 + 地址 */}
          <div className="z-10 mt-1.5 flex flex-col items-center gap-1 text-sm text-white/50">
            <span className="font-medium text-white/70">{space.name}</span>
            {space.address && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {space.address}
              </span>
            )}
          </div>

          {/* 性格标签 */}
          {character.tags && character.tags.length > 0 && (
            <div className="z-10 mt-3 flex flex-wrap justify-center gap-1.5">
              {character.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs text-violet-300/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 关系状态区 ────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4 rounded-3xl border border-white/6 bg-white/4 p-5">
          {/* 好感阶段 */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">
                {affinityMeta.name_zh}
              </span>
            </div>
            {/* 结缘徽章 */}
            {hasActiveBond && bondStatus?.active_bond && (
              <BondBadge
                bondType={bondStatus.active_bond.bond_type}
                status={bondStatus.active_bond.status}
                size="sm"
              />
            )}
            {hasPendingBond && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-300 border border-amber-500/30">
                申请中
              </span>
            )}
            {!hasActiveBond && !hasPendingBond && !bondLoading && bondStatus?.can_apply && (
              <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs text-violet-300">
                可申请结缘
              </span>
            )}
          </div>

          {/* 好感进度条 */}
          <AffinityProgress stage={visitorStage} strength={visitorStrength} compact />

          {/* TA 记得 */}
          <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
            <Brain className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
            <span>
              {memoryCount === null
                ? "读取记忆中…"
                : memoryCount === 0
                  ? "TA 还不记得你什么"
                  : `TA 记得你 ${memoryCount} 件事`}
            </span>
          </div>
        </div>

        {/* ── CTA 按钮区 ────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4 flex gap-3">
          <button
            id="npc-detail-chat"
            type="button"
            onClick={() => navigate(characterSpacePath(space, character))}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 active:bg-violet-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            去角色所在空间
          </button>

          {bondStatus?.can_apply && !hasActiveBond && !hasPendingBond && (
            <button
              id="npc-detail-apply-bond"
              type="button"
              onClick={() => navigate(characterSpacePath(space, character))}
              className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              申请结缘
            </button>
          )}
        </div>

        {/* ── NPC 简介 ──────────────────────────────────────────────────── */}
        {(character.description || character.personality) && (
          <div className="mx-4 mb-4 rounded-3xl border border-white/6 bg-white/3 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">
              关于 TA
            </h2>
            {character.description && (
              <p className="text-sm leading-6 text-white/60">{character.description}</p>
            )}
            {character.hobbies && character.hobbies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {character.hobbies.slice(0, 6).map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/40"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NPC 仿真状态 ────────────────────────────────────────────────── */}
        {character.simulation_state && (
          <div className="mx-4 mb-4 rounded-3xl border border-white/6 bg-white/3 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
              数字居民状态
            </h2>
            <NpcSimulationStatusPanel character={character} variant="compact" spaceName={space.name} />
          </div>
        )}

        {/* ── 私密记忆条 ────────────────────────────────────────────────── */}
        {(memoryCount ?? 0) > 0 && (
          <div className="mx-4 mb-4 rounded-3xl border border-violet-500/15 bg-violet-500/5 p-5">
            <button
              id="npc-detail-memories-toggle"
              type="button"
              onClick={() => setMemoriesOpen((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-semibold text-violet-300"
              aria-expanded={memoriesOpen}
            >
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" aria-hidden="true" />
                和 TA 在一起的记忆
              </span>
              {memoriesOpen ? (
                <ChevronUp className="h-4 w-4 text-white/30" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" aria-hidden="true" />
              )}
            </button>

            {memoriesOpen && recentMemories.length > 0 && (
              <ul className="mt-3 space-y-2.5" aria-label="近期记忆">
                {recentMemories.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-violet-500/10 bg-white/3 p-3 text-xs leading-5 text-white/60"
                  >
                    {m.content}
                  </li>
                ))}
              </ul>
            )}
            {memoriesOpen && recentMemories.length === 0 && (
              <p className="mt-3 text-xs text-white/30">暂时没有可显示的记忆</p>
            )}
          </div>
        )}

        {/* ── 重置关系危险区 ────────────────────────────────────────────── */}
        <div className="mx-4 mb-8 rounded-3xl border border-rose-500/15 bg-rose-500/5 p-5">
          <button
            id="npc-detail-danger-toggle"
            type="button"
            onClick={() => setDangerOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-rose-300/70"
            aria-expanded={dangerOpen}
          >
            <span>⚙️ 重置与 TA 的关系</span>
            {dangerOpen ? (
              <ChevronUp className="h-4 w-4 text-white/20" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/20" aria-hidden="true" />
            )}
          </button>

          {dangerOpen && (
            <div className="mt-3">
              <p className="mb-3 text-xs leading-5 text-white/40">
                这会清除你和 {character.name} 的好感记录，让你重新以陌生人身份开始。
                {hasActiveBond && " 你们之间的结缘关系也会结束。"}
              </p>
              <button
                id="npc-detail-reset-btn"
                type="button"
                onClick={() => {
                  setResetResult("")
                  setShowResetModal(true)
                }}
                className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                和 {character.name} 道别
              </button>
              {resetResult && (
                <p className="mt-2 rounded-xl bg-white/5 p-2.5 text-xs text-white/50">
                  {resetResult}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 重置确认弹窗 ─────────────────────────────────────────────────── */}
      {showResetModal && (
        <NpcRelationshipResetModal
          npcName={character.name}
          hasActiveBond={hasActiveBond}
          busy={resetBusy}
          onConfirm={handleResetConfirm}
          onCancel={() => !resetBusy && setShowResetModal(false)}
        />
      )}
    </ProductShell>
  )
}

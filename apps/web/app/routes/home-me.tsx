/**
 * Personal center for visitor-wide assets and owner shortcuts.
 */

import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Clock3, Coins, Compass, DoorOpen, Gift, Home as HomeIcon, MapPinned, MessageCircle, PlayCircle, RefreshCcw, RotateCcw, ShieldCheck, Sparkles, Ticket, UserRound } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLoaderData } from "react-router"

import { useCreatorAccess } from "../hooks/useCreatorAccess"
import { getVisitorEngagement, type VisitorEngagement } from "../lib/engagement"
import { formatSpaceAnchorLocation } from "../product/mapAnchorCopy.js"
import { DEFAULT_VISITOR_ID, errorMessage, listMemories, listSpaces, type MemoryAtom, type Space } from "../lib/spaces"
import { WEB_PATHS, spacePath } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type ViewerRole = "owner" | "visitor"

type HomeRouteLoaderData = {
  ownerId: string
  viewerId: string
  viewerRole: ViewerRole
}

const HOME_PLACE_CREATE_PATH = `${WEB_PATHS.createSpace}?place_type=home`

function cleanIdentity(value: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function buildHomePlaceHref(ownerId: string) {
  if (!ownerId) return HOME_PLACE_CREATE_PATH
  const params = new URLSearchParams({ place_type: "home" })
  params.set("owner_id", ownerId)
  return `${WEB_PATHS.createSpace}?${params.toString()}`
}

type VisitorEngagementRow = {
  space: Space
  progress: VisitorEngagement
}

type ReturnVisitMode = "continue" | "restart" | "trial"

type ReturnVisitRow = {
  space: Space
  memory: MemoryAtom | null
  memoryCount: number
}

/**
 * Keeps visitor-facing home copy compact without changing owner-authored text.
 * @param value Source text from space or visitor-private memory data.
 * @param fallback Text to show when the source is empty.
 * @param maxLength Maximum visible characters before truncation.
 * @returns A short display string; has no persistence side effects.
 */
function compactHomeLine(value: unknown, fallback: string, maxLength = 54) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ") || fallback
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/**
 * Formats a revisit timestamp for a small card chip.
 * @param value ISO-like timestamp from visitor state or memory data.
 * @returns A zh-CN date/time label, or a safe fallback when unavailable.
 */
function formatRevisitTime(value: unknown) {
  const date = new Date(String(value || ""))
  if (!Number.isFinite(date.getTime())) return "等你回来"
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Reads a visitor relationship label from the existing visitor-state payload.
 * @param space Space entry that may include visitor_state from the current API response.
 * @returns A compact relationship stage label; no private data is queried here.
 */
function relationshipLabel(space: Space) {
  const relationship = space.visitor_state?.relationship as Record<string, unknown> | null | undefined
  return String(relationship?.stage_label_zh || relationship?.stage || "关系待续")
}

/**
 * Builds a deterministic temporary visitor id for trial mode.
 * @param spaceId Target space id.
 * @param visitorId Current visitor id used only as a local namespace.
 * @returns A separate visitor id so trial chat does not write to the current revisit identity.
 */
function buildTrialVisitorId(spaceId: string, visitorId: string) {
  const cleanSpace = spaceId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 42)
  const cleanVisitor = visitorId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 42)
  return `trial_${cleanVisitor}_${cleanSpace}`
}

/**
 * Builds explicit revisit links for the space route.
 * @param spaceId Target space id.
 * @param visitorId Current visitor id.
 * @param mode Continue, restart, or temporary trial mode.
 * @returns A route href; it does not call APIs or mutate state.
 */
function buildReturnVisitHref(space: Pick<Space, "id" | "name">, visitorId: string, mode: ReturnVisitMode) {
  const params = new URLSearchParams()
  params.set("visitor_id", mode === "trial" ? buildTrialVisitorId(space.id, visitorId) : visitorId)
  params.set("revisit", mode)
  if (mode === "trial") params.set("memory_mode", "trial")
  return `${spacePath(space)}?${params.toString()}`
}

/**
 * Creates one private revisit cue from visitor-owned memory when available.
 * @param row Space plus the current visitor's latest readable memory.
 * @returns Safe card copy scoped to the current visitor id.
 */
function buildReturnVisitCue(row: ReturnVisitRow) {
  if (row.memory?.content) return compactHomeLine(row.memory.content, "上次的线索还在。", 70)
  const visitCount = Number(row.space.visitor_state?.visit_count || 0)
  if (visitCount > 1) return `这是你第 ${visitCount} 次回来，可以接住上次的关系感。`
  return compactHomeLine(row.space.description, "从门口重新进入，让 NPC 接住第一条线索。", 70)
}

/**
 * Shows current-visitor return entry cards on the personal center.
 * @param viewerId Visitor id from route query; falls back to the local anonymous visitor id.
 * @returns A visitor-scoped panel; it only reads space/memory data and never writes visit history.
 */
function ReturnVisitSurfacePanel({ viewerId }: { viewerId: string }) {
  const visitorId = viewerId || DEFAULT_VISITOR_ID
  const visitorLabel = compactHomeLine(visitorId, "旅人", 18)
  const [rows, setRows] = useState<ReturnVisitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const loadTokenRef = useRef(0)

  /**
   * Loads public space entries first, then hydrates visitor memory cues in the background.
   * @returns void; updates local component state and never calls enter/chat/write APIs.
   */
  async function loadReturnVisits() {
    const loadToken = loadTokenRef.current + 1
    loadTokenRef.current = loadToken
    setLoading(true)
    setError("")
    try {
      const list = await listSpaces({ limit: 12, offset: 0, visitor_id: visitorId })
      const spaces = Array.isArray(list.spaces) ? list.spaces : []
      const baseRows: ReturnVisitRow[] = spaces.map((space) => ({ space, memory: null, memoryCount: 0 }))
      if (loadTokenRef.current !== loadToken) return
      setRows(baseRows)
      setLoading(false)

      const memoryResults = await Promise.allSettled(
        baseRows.map(async (row) => {
          const memories = await listMemories(row.space.id, { visitor_id: visitorId, visibility: "visitor", limit: 1 }, visitorId)
          const memoryList = Array.isArray(memories.memories) ? memories.memories : []
          return {
            spaceId: row.space.id,
            memory: memoryList[0] || null,
            memoryCount: Number(memories.total ?? memories.count ?? memoryList.length ?? 0),
          }
        }),
      )
      if (loadTokenRef.current !== loadToken) return
      const memoryBySpace = new Map(
        memoryResults.flatMap((result) => result.status === "fulfilled" ? [[result.value.spaceId, result.value]] : []),
      )
      setRows((currentRows) => currentRows.map((row) => {
        const memoryPatch = memoryBySpace.get(row.space.id)
        return memoryPatch
          ? { ...row, memory: memoryPatch.memory, memoryCount: memoryPatch.memoryCount }
          : row
      }))
    } catch (err) {
      if (loadTokenRef.current !== loadToken) return
      setError(errorMessage(err))
      setRows([])
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReturnVisits()
    return () => {
      loadTokenRef.current += 1
    }
  }, [visitorId])

  const sortedRows = useMemo(() => [...rows]
    .sort((a, b) => {
      const memoryDiff = Number(b.memoryCount > 0) - Number(a.memoryCount > 0)
      if (memoryDiff !== 0) return memoryDiff
      const visitDiff = Number(b.space.visitor_state?.visit_count || 0) - Number(a.space.visitor_state?.visit_count || 0)
      if (visitDiff !== 0) return visitDiff
      return Number(b.space.visit_count || 0) - Number(a.space.visit_count || 0)
    })
    .slice(0, 4), [rows])

  const memorySpaces = rows.filter((row) => row.memoryCount > 0).length
  const returningSpaces = rows.filter((row) => Number(row.space.visitor_state?.visit_count || 0) > 1).length

  return (
    <Card data-return-visit-surface className="border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              继续你的私密回访
            </CardTitle>
            <CardDescription className="mt-2">
              当前访客可见的空间、记忆与继续入口。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadReturnVisits()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-300/22 bg-cyan-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/72">可回访空间</p>
            <p className="mt-2 text-3xl font-black text-cyan-100">{rows.length}</p>
            <p className="mt-1 text-xs text-cyan-100/60">可进入</p>
          </div>
          <div className="rounded-2xl border border-lime-300/22 bg-lime-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-100/72">记忆线索</p>
            <p className="mt-2 text-3xl font-black text-lime-100">{memorySpaces}</p>
            <p className="mt-1 text-xs text-lime-100/60">私密</p>
          </div>
          <div className="rounded-2xl border border-violet-300/22 bg-violet-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/72">回访身份</p>
            <p className="mt-2 truncate text-lg font-black text-violet-50">{visitorLabel}</p>
            <p className="mt-1 text-xs text-violet-100/60">{returningSpaces ? `${returningSpaces} 个关系待续` : "新访客"}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-4 text-sm text-red-100">
            回访入口暂不可用：{error}
          </div>
        ) : null}

        {loading ? (
          <p className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm text-theme-muted">正在同步你的回访入口…</p>
        ) : sortedRows.length ? (
          <div className="grid gap-3" data-return-visit-card-list data-return-visit-loaded>
            {sortedRows.map((row) => {
              const anchor = formatSpaceAnchorLocation(row.space)
              const lastTime = formatRevisitTime(row.memory?.updated_at || row.space.visitor_state?.last_visit)
              const npcCount = Array.isArray(row.space.characters) ? row.space.characters.length : 0
              return (
                <article key={row.space.id} data-return-visit-card className="rounded-[1.6rem] border border-white/10 bg-slate-950/42 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
                          <MapPinned className="h-3.5 w-3.5" />
                          {anchor.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-violet-100/70">
                          <Clock3 className="h-3.5 w-3.5" />
                          {lastTime}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black text-theme-primary">{row.space.name || row.space.id}</h3>
                      <p className="mt-1 truncate text-xs font-bold text-theme-muted">{anchor.line}</p>
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs font-bold text-theme-muted">
                      <span className="rounded-xl border border-theme-border bg-theme-card px-2.5 py-1">{npcCount} 位 NPC</span>
                      <span className="rounded-xl border border-theme-border bg-theme-card px-2.5 py-1">{relationshipLabel(row.space)}</span>
                    </div>
                  </div>
                  <p className="mt-3 rounded-2xl border border-theme-border bg-theme-card p-3 text-sm leading-6 text-violet-50/72">
                    {buildReturnVisitCue(row)}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Button asChild className="min-h-12">
                      <Link to={buildReturnVisitHref(row.space, visitorId, "continue")}>
                        <PlayCircle className="h-4 w-4" />
                        继续回访
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" className="min-h-12">
                      <Link to={buildReturnVisitHref(row.space, visitorId, "restart")}>
                        <RotateCcw className="h-4 w-4" />
                        从入口重开
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="min-h-12">
                      <Link to={buildReturnVisitHref(row.space, visitorId, "trial")}>
                        <DoorOpen className="h-4 w-4" />
                        临时试游
                      </Link>
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div data-return-visit-empty data-return-visit-loaded className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-theme-muted">
            还没有可回访空间。先去发现公开空间。
            <Button asChild variant="secondary" className="mt-3 w-full justify-start">
              <Link to={WEB_PATHS.spaces}>
                <Compass className="h-4 w-4" />
                去发现公开空间
              </Link>
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-theme-muted">
          <p className="flex items-center gap-2 font-bold text-theme-primary">
            <MessageCircle className="h-4 w-4 text-cyan-200" />
            手动回访 · 不发通知 · 不公开记忆
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function VisitorEngagementSummaryPanel({ viewerId }: { viewerId: string }) {
  const visitorId = viewerId || DEFAULT_VISITOR_ID
  const visitorLabel = viewerId ? visitorId : "旅人"
  const [rows, setRows] = useState<VisitorEngagementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadSummary() {
    setLoading(true)
    setError("")
    try {
      const list = await listSpaces({ limit: 24, offset: 0 })
      const spaces = Array.isArray(list.spaces) ? list.spaces : []
      const results = await Promise.allSettled(
        spaces.map(async (space) => ({
          space,
          progress: await getVisitorEngagement(space.id, visitorId),
        })),
      )
      setRows(
        results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []),
      )
    } catch (err) {
      setError(errorMessage(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [visitorId])

  const summary = useMemo(() => rows.reduce(
    (acc, row) => {
      const wallet = row.progress.wallet || { balance: 0, lifetime_earned: 0, lifetime_spent: 0 }
      const balance = Number(wallet.balance || 0)
      const lifetimeEarned = Number(wallet.lifetime_earned || 0)
      const lifetimeSpent = Number(wallet.lifetime_spent || 0)
      const vouchers = Number(row.progress.vouchers_available || 0)
      acc.balance += balance
      acc.lifetimeEarned += lifetimeEarned
      acc.lifetimeSpent += lifetimeSpent
      acc.vouchers += vouchers
      if (balance > 0 || lifetimeEarned > 0 || lifetimeSpent > 0 || vouchers > 0) acc.activeSpaces += 1
      return acc
    },
    { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, vouchers: 0, activeSpaces: 0 },
  ), [rows])

  const topRows = useMemo(() => [...rows]
    .sort((a, b) => Number(b.progress.wallet?.balance || 0) - Number(a.progress.wallet?.balance || 0))
    .slice(0, 5), [rows])

  return (
    <Card data-visitor-engagement-summary className="border-amber-300/18 bg-amber-300/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-300" />
              游客资产汇总
            </CardTitle>
            <CardDescription className="mt-2">
              纪念币和礼物券按当前访客汇总。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadSummary()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/72">总余额</p>
            <p className="mt-2 text-3xl font-black text-amber-200">{summary.balance}</p>
            <p className="mt-1 text-xs text-amber-100/64">全部空间汇总</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/22 bg-emerald-400/8 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/72">累计获得</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">{summary.lifetimeEarned}</p>
            <p className="mt-1 text-xs text-emerald-100/64">完成玩法 / NPC 赠予</p>
          </div>
          <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/72">礼物券</p>
            <p className="mt-2 text-3xl font-black text-violet-200">{summary.vouchers}</p>
            <p className="mt-1 text-xs text-violet-100/64">全局可见汇总</p>
          </div>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-theme-muted">
          <p className="flex items-center gap-2 font-bold text-theme-primary">
            <Gift className="h-4 w-4 text-amber-300" />
            资产跟随当前访客
          </p>
          <p className="mt-2">
            送礼和兑换仍回到对应空间确认。
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-4 text-sm text-red-100">
            资产汇总暂不可用：{error}
          </div>
        ) : null}

        {loading ? (
          <p className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm text-theme-muted">正在同步游客资产汇总…</p>
        ) : topRows.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-theme-muted">
              <span>空间明细</span>
              <span>{summary.activeSpaces} 个有资产记录</span>
            </div>
            {topRows.map(({ space, progress }) => (
              <Link
                key={space.id}
                to={spacePath(space)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-theme-border bg-theme-card p-3 text-sm transition hover:border-theme-accent-border"
              >
                <span className="min-w-0">
                  <span className="block truncate font-black text-theme-primary">{space.name || space.id}</span>
                  <span className="mt-0.5 block truncate text-xs text-theme-muted">{progress.coin_label || "纪念币"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs font-bold text-theme-muted">
                  <span className="inline-flex items-center gap-1 text-amber-200">
                    <Coins className="h-3.5 w-3.5" />
                    {Number(progress.wallet?.balance || 0)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-violet-200">
                    <Ticket className="h-3.5 w-3.5" />
                    {Number(progress.vouchers_available || 0)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-theme-muted">
            暂时没有游客资产记录。进入空间并完成店主已发布的玩法后，这里会汇总展示。
          </div>
        )}

        <p className="text-xs leading-5 text-theme-muted">
          当前回访标识：<span className="font-bold text-theme-primary">{visitorLabel}</span>
        </p>
      </CardContent>
    </Card>
  )
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<HomeRouteLoaderData> {
  const url = new URL(request.url)
  const ownerId = cleanIdentity(url.searchParams.get("owner_id"))
  const viewerId = cleanIdentity(url.searchParams.get("user_id"))
  const viewerRole: ViewerRole = ownerId && viewerId && ownerId === viewerId ? "owner" : "visitor"

  return { ownerId, viewerId, viewerRole }
}

export default function HomeMePage() {
  const { ownerId, viewerId, viewerRole } = useLoaderData<typeof clientLoader>()
  const { allowed: showCreatorTools } = useCreatorAccess()
  const homePlaceHref = buildHomePlaceHref(ownerId)
  const ownerHref = ownerId ? `${WEB_PATHS.owner}?owner_id=${encodeURIComponent(ownerId)}` : WEB_PATHS.owner
  const isOwnerView = viewerRole === "owner"
  const showOwnerControls = showCreatorTools && isOwnerView

  return (
    <ProductShell eyebrow="我的家">
      <section
        data-home-route-mode="personal-center"
        className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
      >
        <div className="space-y-6">
          <div className="rounded-[2.4rem] border border-lime-300/18 bg-gradient-to-br from-lime-300/12 via-cyan-300/8 to-slate-950/70 p-6 shadow-2xl shadow-black/25 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-3xl border border-lime-200/30 bg-lime-300/12 text-3xl shadow-[0_0_32px_rgba(190,242,100,0.14)]">
                🏠
              </span>
              <span className="rounded-full border border-lime-200/28 bg-lime-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-lime-50">
                个人中心
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-theme-primary sm:text-5xl">
              你的回访与空间入口
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-theme-muted">
              {showCreatorTools
                ? "先接回你和空间 / NPC 的关系线，再查看资产或进入店主入口。想聊天时，请从具体空间继续。"
                : "先接回你和空间 / NPC 的关系线，再查看资产或继续探索。想聊天时，请从具体空间继续。"}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {showCreatorTools ? (
                <>
                  <Button asChild size="lg" className="min-h-14">
                    <Link to={homePlaceHref}>
                      <HomeIcon className="h-5 w-5" />
                      创建自己的空间
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="min-h-14">
                    <Link to={ownerHref}>
                      <UserRound className="h-5 w-5" />
                      管理已有空间
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="lg" className="min-h-14">
                  <Link to={WEB_PATHS.spaces}>
                    <Compass className="h-5 w-5" />
                    发现公开空间
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: MapPinned,
                title: "我的坐标",
                text: showCreatorTools
                  ? "想开一间自己的空间时，先选择真实地点，再填写内容。"
                  : "从真实坐标发现可以进入和回访的空间。",
              },
              {
                icon: ShieldCheck,
                title: "私密空间",
                text: "家、工作室等私人空间默认只通过分享链接进入。",
              },
              {
                icon: Compass,
                title: "回到探索",
                text: "想继续拜访别人的空间，可以从发现页进入。",
              },
            ].map((item) => (
              <Card key={item.title} className="border-theme-border bg-theme-card">
                <CardHeader>
                  <item.icon className="h-6 w-6 text-lime-100" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-theme-muted">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <ReturnVisitSurfacePanel viewerId={viewerId} />

          <VisitorEngagementSummaryPanel viewerId={viewerId} />

          <Card className="border-theme-accent-border bg-theme-accent-bg">
            <CardHeader>
              <CardTitle>{showOwnerControls ? "店主入口" : "继续探索"}</CardTitle>
              <CardDescription>
                {showOwnerControls
                  ? "你可以继续创建或管理自己的空间。"
                  : "从这里回到发现页，或使用朋友分享的空间链接进入。"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-theme-muted">
              {showOwnerControls ? (
                <>
                  <p>继续完善你的空间，或回到店主管理页查看回访情况。</p>
                  <div className="grid gap-2">
                    <Button asChild variant="secondary" className="min-h-12 justify-start">
                      <Link to={homePlaceHref}>创建自己的空间</Link>
                    </Button>
                    <Button asChild variant="secondary" className="min-h-12 justify-start">
                      <Link to={ownerHref}>进入店主管理</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    如果你是访客，可以从主人分享的链接进入具体空间，也可以在发现页看看公开空间。
                  </p>
                  <Button asChild variant="secondary" className="min-h-12 w-full justify-start">
                    <Link to={WEB_PATHS.spaces}>去发现公开空间</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-theme-border bg-theme-card">
            <CardHeader>
              <CardTitle>保持简单</CardTitle>
              <CardDescription>个人中心只做汇总和跳转，具体体验回到对应空间完成。</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-theme-muted">
                <li>• 聊天请进入具体空间后开始。</li>
                <li>• 反馈只发给店主，不做公开留言墙。</li>
                <li>• 空间内容仍由店主自己确认和发布。</li>
              </ul>
              <div className="mt-5 rounded-2xl border border-theme-border bg-theme-card p-3 text-xs leading-5 text-theme-muted">
                当前身份：{showOwnerControls ? "店主" : "访客"} · {(viewerId || ownerId) ? "已识别" : "旅人"}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </ProductShell>
  )
}

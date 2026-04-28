import {
  Archive,
  BellRing,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Eye,
  Home,
  Map as MapIcon,
  MapPinned,
  Martini,
  MessageCircle,
  Moon,
  Navigation,
  Network,
  PenLine,
  ScrollText,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router"

import npcDialogueImage from "../../assets/homepage-reference/modules/npc-dialogue.png"
import tavernNeonImage from "../../assets/homepage-reference/modules/tavern-neon.png"
import tavernNightImage from "../../assets/homepage-reference/modules/tavern-night.png"
import tavernStreetImage from "../../assets/homepage-reference/modules/tavern-street.png"
import { buildTavernLayoutStats, normalizeTavernLayoutStyle, TAVERN_LAYOUTS } from "../../lib/tavern-layouts.js"
import type { RoleplayClaim, RoleplayState, Tavern, TavernCharacter } from "../../lib/taverns"
import { cn } from "../../lib/utils"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { TavernChat } from "../tavern-chat"
import { TavernNpcStage } from "../tavern-npc-stage"

type TavernLayoutAction = {
  title: string
  text: string
  icon: string
  targetLayout?: string
}

type TavernLayout = {
  id: string
  title: string
  navLabel: string
  eyebrow: string
  icon: string
  description: string
  accent: string
  actions: TavernLayoutAction[]
}

type TavernLayoutStats = {
  location: string
  accessStatus: string
  characterCount: number
  worldInfoCount: number
  gameplayCount: number
  visitCount: number
  claims: { approved: number; pending: number; rejected: number; revoked: number }
  // Time status fields
  timeStatus?: {
    timezone: string
    localTimeDisplay: string
    isOpen: boolean
    localDate?: string
    localSeason?: string
    localDayOfWeek?: string
    localHour?: number
  }
}

type TavernLayoutShowcaseProps = {
  tavernId: string
  tavern: Tavern | null
  error: string
  characters: TavernCharacter[]
  selectedCharacter?: TavernCharacter
  selectedCharacterId: string
  roleplay: RoleplayState | null
  onSelectCharacter: (character: TavernCharacter) => void
  shareSlot?: ReactNode
  creatorSlot?: ReactNode
}

type LayoutProps = TavernLayoutShowcaseProps & {
  tavern: Tavern
  stats: TavernLayoutStats
  onLayoutChange: (layoutId: string) => void
}

type WorldInfoPreview = {
  title: string
  text: string
  tag: string
}

const layoutIconMap: Record<string, LucideIcon> = {
  home: Home,
  user: UserRound,
  clipboard: ClipboardList,
  bell: BellRing,
}

const actionIconMap: Record<string, LucideIcon> = {
  archive: Archive,
  bell: BellRing,
  book: BookOpen,
  clipboard: ClipboardList,
  door: DoorOpen,
  map: MapIcon,
  martini: Martini,
  message: MessageCircle,
  network: Network,
  pen: PenLine,
  scroll: ScrollText,
  users: UsersRound,
}

const layoutBackgroundImages: Record<string, string> = {
  lobby: tavernNeonImage,
  "npc-chat": npcDialogueImage,
  "quest-play": tavernNightImage,
  "hybrid-room": tavernStreetImage,
}

const accentClasses: Record<string, { active: string; chip: string; icon: string; glow: string }> = {
  amber: {
    active: "border-amber-300/60 bg-amber-300/14 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.14)]",
    chip: "border-amber-300/24 bg-amber-300/10 text-amber-100",
    icon: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    glow: "from-amber-300/22 via-transparent to-cyan-300/10",
  },
  cyan: {
    active: "border-cyan-300/65 bg-cyan-300/14 text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.16)]",
    chip: "border-cyan-300/24 bg-cyan-300/10 text-cyan-100",
    icon: "border-cyan-300/30 bg-cyan-300/12 text-cyan-100",
    glow: "from-cyan-300/22 via-transparent to-fuchsia-300/10",
  },
  violet: {
    active: "border-violet-300/65 bg-violet-300/14 text-violet-50 shadow-[0_0_28px_rgba(167,139,250,0.16)]",
    chip: "border-violet-300/24 bg-violet-300/10 text-violet-100",
    icon: "border-violet-300/30 bg-violet-300/12 text-violet-100",
    glow: "from-violet-300/22 via-transparent to-amber-300/10",
  },
  emerald: {
    active: "border-emerald-300/65 bg-emerald-300/14 text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.16)]",
    chip: "border-emerald-300/24 bg-emerald-300/10 text-emerald-100",
    icon: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
    glow: "from-emerald-300/22 via-transparent to-cyan-300/10",
  },
}

function iconFor(name: string, map: Record<string, LucideIcon>, fallback: LucideIcon = Sparkles) {
  return map[name] || fallback
}

function layoutById(layoutId: string): TavernLayout {
  return (TAVERN_LAYOUTS.find((layout: TavernLayout) => layout.id === layoutId) || TAVERN_LAYOUTS[0]) as TavernLayout
}

function accentFor(layout: TavernLayout) {
  return accentClasses[layout.accent] || accentClasses.cyan
}

function characterAvatar(character?: TavernCharacter) {
  if (!character) return ""
  return (
    character.sprites?.neutral
    || character.avatar
    || character.image_url
    || Object.values(character.sprites || {}).find(Boolean)
    || ""
  )
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function previewText(value: string, maxLength = 84) {
  const cleaned = value.replace(/\s+/g, " ").trim()
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned
}

function worldInfoPreviews(tavern: Tavern): WorldInfoPreview[] {
  const entries = Array.isArray(tavern.world_info) ? tavern.world_info : []
  return entries.slice(0, 4).map((entry, index) => {
    const record = toRecord(entry)
    const keys = Array.isArray(record.keys) ? record.keys.filter((key): key is string => typeof key === "string") : []
    return {
      title: keys[0] || toText(record.id, `记忆片段 ${index + 1}`),
      text: previewText(toText(record.content, "店主还没有写下这条世界知识内容。")),
      tag: keys[1] || "世界书",
    }
  })
}

function gameplayTitle(value: unknown, index: number) {
  const record = toRecord(value)
  return toText(record.title, toText(record.name, `玩法 ${index + 1}`))
}

function approvedClaimFor(characterId: string, claims: RoleplayClaim[] = []) {
  return claims.find((claim) => claim.character_id === characterId && claim.status === "approved")
}

function TimeStatusBadge({ timeStatus }: { timeStatus: NonNullable<TavernLayoutStats["timeStatus"]> }) {
  const isNight = timeStatus.localHour !== undefined && (timeStatus.localHour < 6 || timeStatus.localHour >= 19)
  return (
    <div className="rounded-3xl border border-white/10 bg-black/34 p-4">
      <p className="text-xs text-violet-100/45">当地时间</p>
      <div className="mt-2 flex items-center gap-2">
        {isNight ? (
          <Moon className="h-5 w-5 text-indigo-300" />
        ) : (
          <Sun className="h-5 w-5 text-amber-300" />
        )}
        <span className="text-xl font-black text-white">{timeStatus.localTimeDisplay}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
            timeStatus.isOpen
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/30 bg-amber-300/10 text-amber-100"
          }`}
        >
          {timeStatus.isOpen ? "营业中" : "已打烊"}
        </span>
        {timeStatus.localDayOfWeek && (
          <span className="text-xs text-violet-100/55">{timeStatus.localDayOfWeek}</span>
        )}
        {timeStatus.localSeason && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-violet-100/55">
            {timeStatus.localSeason}
          </span>
        )}
      </div>
    </div>
  )
}

function LayoutHeader({
  tavernId,
  tavern,
  error,
  activeLayout,
  activeLayoutId,
  stats,
  onLayoutChange,
}: {
  tavernId: string
  tavern: Tavern | null
  error: string
  activeLayout: TavernLayout
  activeLayoutId: string
  stats: TavernLayoutStats
  onLayoutChange: (layoutId: string) => void
}) {
  const accent = accentFor(activeLayout)
  const backgroundImage = layoutBackgroundImages[activeLayout.id] || tavernNeonImage
  const timeStatus = stats.timeStatus

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[2.4rem] border border-white/12 bg-slate-950/78 shadow-2xl shadow-black/35">
      <img src={backgroundImage} alt="酒馆布局背景" className="absolute inset-0 h-full w-full object-cover opacity-58" loading="eager" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#040511]/98 via-[#060713]/74 to-[#050615]/48" />
      <div className={cn("absolute inset-0 bg-gradient-to-br", accent.glow)} />
      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]", accent.chip)}>
                <DoorOpen className="h-3.5 w-3.5" />
                {activeLayout.eyebrow}
              </span>
              <span className="rounded-full border border-white/12 bg-black/34 px-3 py-1.5 text-xs font-bold text-violet-50/68">{stats.accessStatus}</span>
              <span className="rounded-full border border-white/12 bg-black/34 px-3 py-1.5 text-xs font-bold text-violet-50/68">{stats.location}</span>
            </div>
            <div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {tavern?.name || "酒馆入口"}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-violet-50/74">
                {tavern?.description || `目标酒馆 ID：${tavernId || "未指定"}`}
              </p>
            </div>
            {error ? <p className="max-w-3xl rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">加载失败：{error}</p> : null}
          </div>

          <div className="grid shrink-0 gap-3 sm:grid-cols-3 xl:w-[24rem] xl:grid-cols-1">
            <Link to="/discover" className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50 transition hover:border-cyan-200/55">
              <MapPinned className="mb-3 h-5 w-5" />
              返回地图发现
            </Link>
            {timeStatus ? (
              <TimeStatusBadge timeStatus={timeStatus} />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/34 p-4">
                <p className="text-xs text-violet-100/45">店主心情</p>
                <p className="mt-2 font-black text-white">雨夜 / 爵土 / 低语</p>
              </div>
            )}
            <div className="rounded-3xl border border-white/10 bg-black/34 p-4">
              <p className="text-xs text-violet-100/45">Roleplay</p>
              <p className="mt-2 font-black text-white">批准 {stats.claims.approved} · 待处理 {stats.claims.pending}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="酒馆布局样式">
          {TAVERN_LAYOUTS.map((layout: TavernLayout) => {
            const Icon = iconFor(layout.icon, layoutIconMap)
            const itemAccent = accentFor(layout)
            const active = layout.id === activeLayoutId
            return (
              <button
                key={layout.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onLayoutChange(layout.id)}
                className={cn(
                  "group min-w-0 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                  active ? itemAccent.active : "border-white/10 bg-slate-950/52 text-violet-100/72 hover:bg-white/[0.06]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl border", active ? itemAccent.icon : "border-white/12 bg-white/[0.05] text-violet-100/60")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{layout.navLabel}</p>
                    <p className="truncate text-xs text-violet-100/52">{layout.title}</p>
                  </div>
                </div>
                {active ? <p className="mt-3 text-xs leading-5 text-violet-50/72">{layout.description}</p> : null}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ActionGrid({ actions, onLayoutChange }: { actions: TavernLayoutAction[]; onLayoutChange: (layoutId: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = iconFor(action.icon, actionIconMap)
        const clickable = Boolean(action.targetLayout)
        return (
          <button
            key={`${action.title}-${action.text}`}
            type="button"
            disabled={!clickable}
            onClick={() => action.targetLayout ? onLayoutChange(action.targetLayout) : undefined}
            className={cn(
              "group min-w-0 rounded-3xl border border-amber-300/18 bg-amber-300/8 p-4 text-left transition",
              clickable ? "hover:-translate-y-0.5 hover:border-cyan-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" : "cursor-default",
            )}
          >
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/24 bg-black/35 text-amber-100">
              <Icon className="h-6 w-6" />
            </span>
            <p className="text-lg font-black text-white">{action.title}</p>
            <p className="mt-1 text-sm text-violet-100/60">{action.text}</p>
          </button>
        )
      })}
    </div>
  )
}

function NpcRosterPanel({ tavern, characters, selectedCharacterId, roleplay, onSelectCharacter }: LayoutProps) {
  const claims = roleplay?.claims || []
  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <CardTitle>NPC 列表</CardTitle>
          <CardDescription className="mt-1">选择当前想对话或调查的角色。</CardDescription>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-violet-100/62">全部</span>
      </div>
      <div className="space-y-3 p-4">
        {characters.length ? characters.map((character, index) => {
          const avatar = characterAvatar(character)
          const active = character.id === selectedCharacterId || (!selectedCharacterId && index === 0)
          const approvedClaim = approvedClaimFor(character.id, claims)
          return (
            <button
              key={character.id || `${character.name}-${index}`}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCharacter(character)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-3xl border p-3 text-left transition hover:border-cyan-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                active ? "border-cyan-300/55 bg-cyan-300/12" : "border-white/10 bg-white/[0.04]",
              )}
            >
              {avatar ? (
                <img src={avatar} alt={character.name || "NPC 头像"} className="h-16 w-16 shrink-0 rounded-2xl object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/12 bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-xl font-black text-white">
                  {initialFor(character.name || character.id)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-white">{character.name || "未命名 NPC"}</span>
                <span className="mt-1 block truncate text-xs text-violet-100/52">{character.description || character.first_mes || "店主尚未填写简介"}</span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-100/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {approvedClaim ? `玩家扮演：${approvedClaim.player_name || approvedClaim.player_id}` : active ? "在线" : "可对话"}
                </span>
              </span>
            </button>
          )
        }) : (
          <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-violet-100/64">
            这间酒馆还没有 NPC。店主添加角色卡后会显示在这里。
          </p>
        )}
        <Button type="button" variant="secondary" className="w-full" disabled>
          邀请 NPC 入座
        </Button>
      </div>
    </Card>
  )
}

function CharacterFocusCard({ tavern, character }: { tavern: Tavern; character?: TavernCharacter }) {
  const avatar = characterAvatar(character)
  return (
    <Card className="relative min-w-0 overflow-hidden p-0">
      <img src={tavernStreetImage} alt="当前 NPC 背景" className="absolute inset-0 h-full w-full object-cover opacity-28" loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/76 to-slate-950/54" />
      <div className="relative grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        {avatar ? (
          <img src={avatar} alt={character?.name || "NPC 头像"} className="h-28 w-28 rounded-3xl border border-white/12 object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="grid h-28 w-28 place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-300/10 text-3xl font-black text-white">
            {initialFor(character?.name || "NPC")}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/68">当前会话角色</p>
          <h2 className="mt-2 text-2xl font-black text-white">{character?.name || "暂无 NPC"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-50/72">
            {character?.description || character?.personality || character?.first_mes || `${tavern.name} 还没有可展示的角色介绍。`}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1">
          <span className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-violet-50">资料</span>
          <span className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-violet-50">记忆</span>
          <span className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-violet-50">好感度</span>
        </div>
      </div>
    </Card>
  )
}

function MemoryFragmentsPanel({ tavern }: { tavern: Tavern }) {
  const previews = worldInfoPreviews(tavern)
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-cyan-200" /> 记忆碎片 / 背包</CardTitle>
        <CardDescription>读取店主配置的世界知识摘要，不新增或改写持久化字段。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {previews.length ? previews.map((item) => (
          <div key={`${item.title}-${item.tag}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black text-white">{item.title}</p>
              <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-1 text-[0.65rem] text-cyan-100">{item.tag}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-violet-100/65">{item.text}</p>
          </div>
        )) : (
          <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-violet-100/64">
            暂无世界知识。这里会展示店主手动配置的线索、地点规则或背景设定。
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function LobbyLayout(props: LayoutProps) {
  const { tavern, characters, selectedCharacterId, roleplay, stats, shareSlot, creatorSlot, onSelectCharacter, onLayoutChange } = props
  const layout = layoutById("lobby")
  return (
    <div className="space-y-6">
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
        <Card className="relative min-h-[34rem] min-w-0 overflow-hidden p-0">
          <img src={tavernNightImage} alt="酒馆大厅" className="absolute inset-0 h-full w-full object-cover opacity-72" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/36 to-slate-950/88" />
          <div className="relative grid min-h-[34rem] content-between gap-6 p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-3xl border border-amber-300/18 bg-black/42 p-5 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/70">今日公告</p>
                <h2 className="mt-3 text-2xl font-black text-white">{tavern.name} 正在营业</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-violet-50/72">
                  <li>· 午夜后低声交谈，避免惊扰沉睡的 NPC。</li>
                  <li>· 新客先读店规，再选择角色或任务。</li>
                  <li>· 记忆写回只使用已发生的访客互动。</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-cyan-300/20 bg-slate-950/60 p-4 backdrop-blur-md">
                <div className="min-h-36 rounded-2xl border border-cyan-300/12 bg-[radial-gradient(circle_at_62%_42%,rgba(34,211,238,0.45),transparent_4rem),linear-gradient(135deg,rgba(8,47,73,0.86),rgba(15,23,42,0.86))] p-4">
                  <MapPinned className="h-9 w-9 text-cyan-100" />
                  <p className="mt-6 text-sm font-black text-white">{tavern.address || "真实坐标锚点"}</p>
                  <p className="mt-1 text-xs text-cyan-100/74">{stats.location}</p>
                </div>
              </div>
            </div>
            <ActionGrid actions={layout.actions} onLayoutChange={onLayoutChange} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/42 p-4 backdrop-blur-md">
                <p className="text-xs text-violet-100/45">房间人数</p>
                <p className="mt-2 text-2xl font-black text-white">{Math.max(stats.characterCount + 20, stats.visitCount || 0)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/42 p-4 backdrop-blur-md">
                <p className="text-xs text-violet-100/45">NPC</p>
                <p className="mt-2 text-2xl font-black text-white">{stats.characterCount}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/42 p-4 backdrop-blur-md">
                <p className="text-xs text-violet-100/45">气氛指数</p>
                <p className="mt-2 text-2xl font-black text-cyan-100">78</p>
              </div>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>大厅导览</CardTitle>
              <CardDescription>参考大厅型设计：先看空间、公告、地图位置，再选择下一步。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs text-violet-100/45">玩法</p>
                  <p className="mt-1 font-black text-white">{stats.gameplayCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs text-violet-100/45">记忆</p>
                  <p className="mt-1 font-black text-white">{stats.worldInfoCount}</p>
                </div>
              </div>
              <p className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-violet-50/70">
                {tavern.scene_prompt || "店主还没有写下场景提示。"}
              </p>
            </CardContent>
          </Card>
          {shareSlot}
          {creatorSlot}
        </div>
      </section>
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)]">
        <NpcRosterPanel {...props} />
        <MemoryFragmentsPanel tavern={tavern} />
      </section>
    </div>
  )
}

function NpcChatLayout(props: LayoutProps) {
  const { tavern, characters, selectedCharacter, selectedCharacterId, roleplay, onSelectCharacter } = props
  const actions = layoutById("npc-chat").actions
  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(290px,0.42fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <NpcRosterPanel {...props} />
        <TavernNpcStage
          tavern={tavern}
          characters={characters}
          selectedCharacterId={selectedCharacter?.id}
          roleplayMode={roleplay?.roleplay_mode}
          claims={roleplay?.claims}
          onSelectCharacter={onSelectCharacter}
        />
      </div>
      <div className="min-w-0 space-y-4">
        <CharacterFocusCard tavern={tavern} character={selectedCharacter} />
        <ActionGrid actions={actions} onLayoutChange={props.onLayoutChange} />
        <TavernChat key={selectedCharacter?.id || "no-character"} tavern={tavern} character={selectedCharacter} />
      </div>
    </section>
  )
}

function QuestPlayLayout(props: LayoutProps) {
  const { tavern, selectedCharacter, stats, onLayoutChange } = props
  const layout = layoutById("quest-play")
  const gameplays = Array.isArray(tavern.gameplay_definitions) ? tavern.gameplay_definitions : []
  const activeGameplay = gameplays[0]
  const worldCards = worldInfoPreviews(tavern)
  const fallbackCards = [
    { title: "湿票根", text: "雨城歌剧院的票根，时间被水渍模糊。", tag: "物证" },
    { title: "监控盲区", text: "后巷监控在 22:17-22:43 存在 26 分钟盲区。", tag: "环境" },
    { title: "吧台证词", text: selectedCharacter ? `${selectedCharacter.name} 记得一位客人去过后门。` : "NPC 证词会在对话后出现。", tag: "证言" },
  ]
  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="relative min-w-0 overflow-hidden p-0">
          <img src={tavernStreetImage} alt="委托板背景" className="absolute inset-0 h-full w-full object-cover opacity-34" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/96 via-slate-950/78 to-slate-950/62" />
          <div className="relative grid gap-5 p-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/8 p-4">
              <div className="aspect-[4/5] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(15,23,42,0.72))] p-4">
                <ClipboardList className="h-9 w-9 text-amber-100" />
                <p className="mt-10 text-sm font-black uppercase tracking-[0.18em] text-amber-100/70">当前委托</p>
                <h3 className="mt-3 text-2xl font-black text-white">{activeGameplay ? gameplayTitle(activeGameplay, 0) : "失踪的蓝伞"}</h3>
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-100/60">Quest board</p>
                  <h2 className="mt-2 text-3xl font-black text-white">委托板</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">玩法定义来自店主配置；没有发布玩法时展示可进入的结构占位，不写入平台生成内容。</p>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-black text-cyan-100">进行中</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {["接案", "询问", "搜证", "回报"].map((step, index) => (
                    <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                      <span className={cn("mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full", index <= 2 ? "bg-cyan-300/18 text-cyan-100" : "bg-white/8 text-violet-100/45")}>{index + 1}</span>
                      <p className="text-sm font-bold text-white">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-cyan-300" />
                </div>
                <p className="mt-2 text-sm text-cyan-100/80">进度：2/4 · 线索 {Math.max(stats.worldInfoCount, worldCards.length)}/8</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-cyan-200" /> 关键线索</CardTitle>
                <CardDescription>来自世界书和酒馆上下文的线索卡片。</CardDescription>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-violet-100/60">已收集 {worldCards.length}/8</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {(worldCards.length ? worldCards.slice(0, 3) : fallbackCards).map((item) => (
                <div key={item.title} className="min-h-44 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="font-black text-white">{item.title}</p>
                    <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-1 text-[0.65rem] text-cyan-100">{item.tag}</span>
                  </div>
                  <p className="text-sm leading-6 text-violet-100/66">{item.text}</p>
                  <CheckCircle2 className="mt-4 h-5 w-5 text-cyan-200" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>下一步行动</CardTitle>
            <CardDescription>行动卡会切换到对应布局或作为当前玩法提示。</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionGrid actions={layout.actions} onLayoutChange={onLayoutChange} />
          </CardContent>
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        <MemoryFragmentsPanel tavern={tavern} />
        <TavernChat key={selectedCharacter?.id || "quest-chat"} tavern={tavern} character={selectedCharacter} />
      </div>
    </section>
  )
}

function HybridRoomLayout(props: LayoutProps) {
  const { tavern, characters, selectedCharacterId, roleplay, stats, onSelectCharacter, onLayoutChange } = props
  const layout = layoutById("hybrid-room")
  const events = [
    { title: "风铃响了一次", text: "门口的风铃被风吹动，清脆的声音在酒馆中回荡。", tag: "环境事件", icon: BellRing },
    { title: "旧客留下便签", text: "一张便签被夹在留言墙上，字迹有些熟悉。", tag: "玩家互动", icon: PenLine },
    { title: "NPC 正在等待回应", text: `${characters[0]?.name || "某位 NPC"} 似乎有话想对你说。`, tag: "NPC 动态", icon: MessageCircle },
  ]

  return (
    <div className="space-y-6">
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.46fr)]">
        <Card className="relative min-h-[40rem] min-w-0 overflow-hidden p-0">
          <img src={tavernStreetImage} alt="混合房间" className="absolute inset-0 h-full w-full object-cover opacity-72" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/82 via-slate-950/18 to-slate-950/86" />
          <div className="relative min-h-[40rem] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{stats.location}</span>
              <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black text-fuchsia-100">店内事件</span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">混合房间</span>
            </div>
            <div className="absolute left-[12%] top-[42%]">
              <button type="button" onClick={() => onLayoutChange("npc-chat")} className="rounded-2xl border border-amber-300/30 bg-black/55 px-4 py-3 text-sm font-black text-amber-100 backdrop-blur-md transition hover:border-cyan-300/50">
                <Martini className="mb-2 h-5 w-5" />吧台 <span className="rounded-full bg-red-500/80 px-1.5 text-[0.65rem]">2</span>
              </button>
            </div>
            <div className="absolute right-[22%] top-[31%]">
              <button type="button" onClick={() => onLayoutChange("quest-play")} className="rounded-2xl border border-cyan-300/30 bg-black/55 px-4 py-3 text-sm font-black text-cyan-100 backdrop-blur-md transition hover:border-cyan-300/50">
                <Navigation className="mb-2 h-5 w-5" />窗边座 <span className="rounded-full bg-red-500/80 px-1.5 text-[0.65rem]">1</span>
              </button>
            </div>
            <div className="absolute right-[12%] top-[55%]">
              <button type="button" onClick={() => onLayoutChange("quest-play")} className="rounded-2xl border border-amber-300/30 bg-black/55 px-4 py-3 text-sm font-black text-amber-100 backdrop-blur-md transition hover:border-cyan-300/50">
                <PenLine className="mb-2 h-5 w-5" />留言墙 <span className="rounded-full bg-red-500/80 px-1.5 text-[0.65rem]">3</span>
              </button>
            </div>
            <div className="absolute bottom-[18%] right-[24%]">
              <button type="button" className="rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-sm font-black text-violet-50 backdrop-blur-md">
                <DoorOpen className="mb-2 h-5 w-5" />楼梯口
              </button>
            </div>
            <div className="absolute inset-x-5 bottom-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
                <p className="text-xs text-violet-100/45">房间人数</p>
                <p className="mt-2 text-2xl font-black text-white">{Math.max(28, stats.characterCount + stats.visitCount)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-md sm:col-span-2">
                <p className="text-xs text-violet-100/45">气氛指数</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[78%] bg-cyan-300" />
                  </div>
                  <span className="font-black text-cyan-100">78</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap gap-2 text-sm font-bold text-violet-100/58">
                <span className="rounded-full border border-cyan-300/28 bg-cyan-300/10 px-3 py-1 text-cyan-100">聊天</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">任务</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">记忆</span>
                <span className="rounded-full border border-amber-300/28 bg-amber-300/10 px-3 py-1 text-amber-100">店内事件</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.map((event) => {
                const Icon = event.icon
                return (
                  <div key={event.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-black/35 text-cyan-100"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-black text-white">{event.title}</p>
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-1 text-[0.65rem] text-cyan-100">{event.tag}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-violet-100/65">{event.text}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
          <NpcRosterPanel {...props} />
        </div>
      </section>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>房间动作</CardTitle>
          <CardDescription>混合房间型把探索热点、事件流与聊天 / 任务 / 记忆入口放在同一屏。</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionGrid actions={layout.actions} onLayoutChange={onLayoutChange} />
        </CardContent>
      </Card>
    </div>
  )
}

export function TavernLayoutShowcase(props: TavernLayoutShowcaseProps) {
  const { tavern, tavernId, characters, roleplay, error } = props
  const initialLayoutId = normalizeTavernLayoutStyle(tavern?.layout_style)
  const [activeLayoutId, setActiveLayoutId] = useState<string>(initialLayoutId)
  const activeLayout = layoutById(activeLayoutId)
  const stats = useMemo(
    () => buildTavernLayoutStats(tavern, characters, roleplay?.claims || []) as TavernLayoutStats,
    [tavern, characters, roleplay?.claims],
  )

  useEffect(() => {
    setActiveLayoutId(normalizeTavernLayoutStyle(tavern?.layout_style))
  }, [tavern?.id, tavern?.layout_style])

  if (!tavern) {
    return (
      <div className="space-y-6">
        <LayoutHeader
          tavernId={tavernId}
          tavern={tavern}
          error={error}
          activeLayout={activeLayout}
          activeLayoutId={activeLayoutId}
          stats={stats}
          onLayoutChange={setActiveLayoutId}
        />
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>无法进入酒馆</CardTitle>
            <CardDescription>请从发现页选择一个已存在的酒馆入口。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/discover">返回发现页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const layoutProps: LayoutProps = {
    ...props,
    tavern,
    stats,
    onLayoutChange: setActiveLayoutId,
  }

  return (
    <div className="space-y-6">
      <LayoutHeader
        tavernId={tavernId}
        tavern={tavern}
        error={error}
        activeLayout={activeLayout}
        activeLayoutId={activeLayoutId}
        stats={stats}
        onLayoutChange={setActiveLayoutId}
      />
      {activeLayoutId === "lobby" ? <LobbyLayout {...layoutProps} /> : null}
      {activeLayoutId === "npc-chat" ? <NpcChatLayout {...layoutProps} /> : null}
      {activeLayoutId === "quest-play" ? <QuestPlayLayout {...layoutProps} /> : null}
      {activeLayoutId === "hybrid-room" ? <HybridRoomLayout {...layoutProps} /> : null}
    </div>
  )
}

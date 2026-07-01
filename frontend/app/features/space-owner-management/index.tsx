import { CheckCircle2, Send, ShieldCheck, UserCheck, XCircle, Plus, Settings, Sparkles, BookOpen, UserPlus, PlayCircle, Info, Activity } from "lucide-react"
import { useState } from "react"

import { NpcSimulationStatusPanel } from "../npc-simulation-status/NpcSimulationStatusPanel"
import { RelationshipGraphPanel } from "../relationship-graph"
import { SpaceCapabilityHubPanel } from "../../components/SpaceCapabilityHubPanel"
import TerritoryManagementPanel from "../../components/TerritoryManagementPanel"
import TerritoryClaimPanel from "../../components/TerritoryClaimPanel"
import OwnerStateCardPanel from "../../product/OwnerStateCardPanel"
import { PLACE_RELATIONSHIP_TYPES, normalizePlaceRelationshipDraft } from "../../lib/place-home.js"
import { fallbackRoleplayState } from "../../lib/roleplay-state"
import { CULTIVATION_PLAY_PACK } from "../../lib/cultivation-play-pack.js"
import { deriveSpecialSpaceTypeDisplay } from "../../lib/special-space-types.js"
import {
  addHomeMember,
  addCharacter,
  createPlaceRelationship,
  createSchoolEnrollment,
  createWorldInfo,
  DEFAULT_OWNER_ID,
  DEFAULT_VISITOR_ID,
  deleteVisitorNote,
  decidePlaceRelationship,
  decideRoleplayClaim,
  errorMessage,
  listVisitorNotes,
  requestRoleplayClaim,
  saveGameplays,
  saveRoleplayConfig,
  updateSpace,
  type HomeMember,
  type PlaceRelationship,
  type RoleplayClaim,
  type RoleplayState,
  type Space,
  type SpaceCharacter,
  type SpaceVisitorNote,
} from "../../lib/spaces"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"

function characterName(characters: SpaceCharacter[], characterId: string) {
  return characters.find((character) => character.id === characterId)?.name || characterId
}

function worldInfoTemplateKey(entry: unknown) {
  if (!entry || typeof entry !== "object") return ""
  const record = entry as Record<string, unknown>
  const keys = Array.isArray(record.keys)
    ? record.keys.map((value) => String(value || "").trim()).filter(Boolean).sort()
    : []
  const content = typeof record.content === "string" ? record.content.trim() : ""
  return `${keys.join("|")}::${content}`
}

function previewProgressPercent(current: unknown, target: unknown) {
  const safeCurrent = Number(current)
  const safeTarget = Number(target)
  if (!Number.isFinite(safeCurrent) || !Number.isFinite(safeTarget) || safeTarget <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((safeCurrent / safeTarget) * 100)))
}

function RoleplayPanel({
  space,
  characters,
  roleplay,
  onRoleplayChange,
}: {
  space: Space
  characters: SpaceCharacter[]
  roleplay: RoleplayState
  onRoleplayChange: (state: RoleplayState) => void
}) {
  const [ownerId, setOwnerId] = useState(space.owner_id || DEFAULT_OWNER_ID)
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [playerName, setPlayerName] = useState("Demo performer")
  const [mode, setMode] = useState(String(roleplay.roleplay_mode || "ai_only"))
  const [characterId, setCharacterId] = useState(characters[0]?.id || "")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  const claims = roleplay.claims || []
  const pendingClaims = claims.filter((claim) => claim.status === "pending")
  const approvedClaims = claims.filter((claim) => claim.status === "approved")
  const hybridEnabled = roleplay.roleplay_mode === "hybrid"

  async function run(action: string, task: () => Promise<RoleplayState>, success: string) {
    setBusy(action)
    setMessage("")
    try {
      const next = await task()
      onRoleplayChange(next)
      setMode(String(next.roleplay_mode || "ai_only"))
      setMessage(success)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="relative min-w-0 overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,27,75,0.68))]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
      <CardHeader className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/55">Owner console</p>
            <CardTitle className="mt-1">店主角色控制台</CardTitle>
            <CardDescription className="mt-2">
              只在店主视角处理 NPC 扮演模式与认领审批，不进入访客首屏。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <UserCheck className="h-3.5 w-3.5" />
              Space scoped
            </span>
            <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-violet-50/72">
              {roleplay.roleplay_mode} · {approvedClaims.length} approved · {pendingClaims.length} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <section className="space-y-3 rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.045] p-4">
          <div>
            <p className="text-sm font-black text-white">扮演模式信号</p>
            <p className="mt-1 text-xs leading-5 text-cyan-50/58">
              模式保存后才会影响本空间；店主身份仍由后端权限校验决定。
            </p>
          </div>
          <div className="grid min-w-0 gap-3">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">店主标识</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
              <option value="ai_only">ai_only</option>
              <option value="hybrid">hybrid</option>
            </select>
          </label>
          <Button
            type="button"
            disabled={busy === "mode"}
            className="w-full"
            onClick={() => run("mode", () => saveRoleplayConfig(space.id, { roleplay_mode: mode }, ownerId), "Roleplay mode saved.")}
          >
            <ShieldCheck className="h-4 w-4" />
            Save mode
          </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-violet-300/12 bg-violet-300/[0.045] p-4">
          <div>
            <p className="text-sm font-black text-white">NPC 认领队列</p>
            <p className="mt-1 text-xs leading-5 text-violet-100/58">
              访客可申请临时扮演，店主在这里批准或拒绝；它不是公开社交关系。
            </p>
          </div>
          <div className="grid min-w-0 gap-3">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">访客标识</span>
            <input value={visitorId} onChange={(event) => setVisitorId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">访客昵称</span>
            <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">NPC role</span>
            <select value={characterId} onChange={(event) => setCharacterId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
              {characters.map((character) => (
                <option key={character.id} value={character.id}>{character.name || character.id}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={!hybridEnabled || !characterId || busy === "claim"}
            className="w-full"
            onClick={() => run("claim", () => requestRoleplayClaim(space.id, { character_id: characterId, player_name: playerName }, visitorId), "Claim request sent.")}
          >
            <Send className="h-4 w-4" />
            Request claim
          </Button>
          </div>
        </section>

        {claims.length ? (
          <div data-roleplay-claims="compact" className="space-y-2">
            {claims.map((claim: RoleplayClaim) => (
              <div key={claim.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white" title={`${characterName(characters, claim.character_id)} · ${claim.player_name || claim.player_id}`}>
                    {characterName(characters, claim.character_id)} · {claim.player_name || claim.player_id}
                  </p>
                  <p className="mt-1 truncate text-xs text-violet-100/55" title={`${claim.status} · ${claim.id}`}>{claim.status} · {claim.id}</p>
                </div>
                {claim.status === "pending" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" size="sm" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(space.id, claim.id, { status: "approved" }, ownerId), "Claim approved.")}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(space.id, claim.id, { status: "rejected" }, ownerId), "Claim rejected.")}>
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-100/62">No roleplay claims yet.</p>
        )}

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function PlayPackPanel({ space }: { space: Space }) {
  const [ownerId, setOwnerId] = useState(space.owner_id || DEFAULT_OWNER_ID)
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const specialType = deriveSpecialSpaceTypeDisplay(space)
  const playPack = specialType?.playPackId === CULTIVATION_PLAY_PACK.id ? CULTIVATION_PLAY_PACK : null
  const receiptPreview = playPack?.preview_receipt
  const breakthroughPreview = playPack?.breakthrough_preview

  if (!playPack) return null

  async function handleApplyPack() {
    if (!playPack) return
    setBusy("apply")
    setMessage("")
    try {
      // 1. Add Characters
      for (const char of playPack.characters) {
        const existing = (space.characters || []).find((c) => c.name === char.name)
        if (!existing) {
          await addCharacter(space.id, char, ownerId)
        }
      }

      // 2. Add World Info
      const existingWorldInfoKeys = new Set(
        (Array.isArray(space.world_info) ? space.world_info : [])
          .map((entry) => worldInfoTemplateKey(entry))
          .filter(Boolean),
      )
      for (const wi of playPack.world_info) {
        const templateKey = worldInfoTemplateKey(wi)
        if (templateKey && existingWorldInfoKeys.has(templateKey)) continue
        await createWorldInfo({ ...wi, space_id: space.id }, ownerId)
        if (templateKey) existingWorldInfoKeys.add(templateKey)
      }

      // 3. Save Gameplays
      if (Array.isArray(playPack.gameplay_definitions) && playPack.gameplay_definitions.length > 0) {
        const existingGameplays = Array.isArray(space.gameplay_definitions)
          ? space.gameplay_definitions.filter(
              (existing): existing is Record<string, unknown> =>
                Boolean(existing && typeof existing === "object"),
            )
          : []
        const nextGameplays: Record<string, unknown>[] = [...existingGameplays]
        for (const gp of playPack.gameplay_definitions) {
          if (!nextGameplays.find((existing) => existing && typeof existing === "object" && "id" in existing && existing.id === gp.id)) {
            nextGameplays.push(gp)
          }
        }
        await saveGameplays(space.id, nextGameplays, ownerId)
      }

      // 4. Update Space Metadata
      await updateSpace(space.id, { forbidden: playPack.forbidden }, ownerId)

      setMessage(`「${playPack.name}」已按店主确认注入到当前空间。重复应用会跳过同名 NPC、同 ID 玩法和相同世界书模板。`)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  return (
    <Card
      data-cultivation-play-pack-panel
      className="min-w-0 overflow-hidden border-amber-300/18 bg-[radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_34%),rgba(15,23,42,0.84)]"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/55">Recommended play pack</p>
            <CardTitle className="mt-0.5">{playPack.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-amber-50/72">
          检测到本空间属于 <span className="font-bold text-amber-200">{specialType?.label}</span> 类型。
          你可以一键初始化默认内容，包括建议的 NPC、世界书设定、以及「{playPack.gameplay_definitions?.[0]?.title}」等互动玩法。
        </p>
        <p className="rounded-2xl border border-amber-300/16 bg-amber-300/[0.06] px-4 py-3 text-xs leading-6 text-amber-50/74">
          {playPack.owner_confirmation_note}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <UserPlus className="h-3.5 w-3.5" />
              建议角色
            </div>
            <p className="mt-1 text-sm text-white">{playPack.characters?.[0]?.name}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <BookOpen className="h-3.5 w-3.5" />
              核心设定
            </div>
            <p className="mt-1 text-sm text-white">{playPack.world_info?.length} 条世界书条目</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <PlayCircle className="h-3.5 w-3.5" />
              互动玩法
            </div>
            <p className="mt-1 text-sm text-white">{playPack.gameplay_definitions?.[0]?.title}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <Info className="h-3.5 w-3.5" />
              安全边界
            </div>
            <p className="mt-1 truncate text-sm text-white">{playPack.forbidden}</p>
          </div>
        </div>

        {receiptPreview && breakthroughPreview ? (
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <section
              data-cultivation-receipt-preview
              className="rounded-[1.75rem] border border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(15,23,42,0.34))] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/58">历练回执样例</p>
                  <h3 className="mt-2 text-base font-black text-amber-50">{receiptPreview.title}</h3>
                </div>
                <span className="inline-flex w-fit rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
                  {receiptPreview.action}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-amber-50/78">{receiptPreview.result_summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-100/55">
                    {receiptPreview.progress_label}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{receiptPreview.progress_delta}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-100/55">
                    {receiptPreview.clue_label}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">【{receiptPreview.clue}】</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-amber-50/58">{receiptPreview.boundary_note}</p>
            </section>

            <section
              data-cultivation-breakthrough-preview
              className="rounded-[1.75rem] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(15,23,42,0.34))] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/58">突破条件样例</p>
                  <h3 className="mt-2 text-base font-black text-cyan-50">{breakthroughPreview.title}</h3>
                  <p className="mt-1 text-xs text-cyan-50/66">目标：{breakthroughPreview.next_stage}</p>
                </div>
                <span
                  data-cultivation-breakthrough-status={breakthroughPreview.status}
                  className="inline-flex w-fit rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100"
                >
                  {breakthroughPreview.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-cyan-50/78">{breakthroughPreview.summary}</p>
              <div className="mt-4 space-y-3">
                {breakthroughPreview.requirements.map((item) => {
                  const percent = previewProgressPercent(item.current, item.target)
                  return (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-white">{item.label}</span>
                        <span className="text-cyan-50/70">{item.current}/{item.target}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.95),rgba(34,211,238,0.92),rgba(167,139,250,0.9))]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-cyan-50/58">{item.note}</p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-cyan-50/58">{breakthroughPreview.boundary_note}</p>
            </section>
          </div>
        ) : null}

        <section className="mt-4 space-y-3 rounded-2xl border border-amber-300/12 bg-amber-300/[0.045] p-4">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-amber-100/65">店主标识（用于确认权限）</span>
            <input
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-white outline-none focus:border-amber-300/60"
            />
          </label>
          <Button
            type="button"
            disabled={busy === "apply"}
            className="w-full border-amber-400/50 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30"
            onClick={handleApplyPack}
          >
            {busy === "apply" ? "正在注入..." : "确认并注入玩法包内容"}
          </Button>
          <p className="text-[10px] text-amber-100/45">
            * 上面的回执/要求只是待确认模板说明；点击注入后才会写入当前空间，不会引入战斗、等级、装备、交易或排行。
          </p>
        </section>

        {message ? (
          <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OwnerVisitorNotesPanel({ space }: { space: Space }) {
  const [ownerId, setOwnerId] = useState(space.owner_id || DEFAULT_OWNER_ID)
  const [notes, setNotes] = useState<SpaceVisitorNote[]>([])
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  async function handleLoadOwnerNotes() {
    setBusy("list")
    setMessage("")
    try {
      const payload = await listVisitorNotes(space.id, { limit: 20 }, ownerId)
      setNotes(payload.notes || [])
      setCount(payload.count || 0)
      setMessage("已加载店主可见反馈。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleDeleteNote(noteId: string) {
    setBusy(noteId)
    setMessage("")
    try {
      await deleteVisitorNote(space.id, noteId, ownerId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      setCount((current) => Math.max(0, current - 1))
      setMessage("反馈已删除。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="mt-6 min-w-0 overflow-hidden border-violet-300/18 bg-violet-300/8">
      <CardHeader>
        <CardTitle>访客反馈管理</CardTitle>
        <CardDescription className="mt-2">
          只汇总访客私密反馈，帮助店主复盘体验；这不是公开留言墙，也不支持访客互相回复、点赞或私信。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">店主标识</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <Button type="button" variant="secondary" disabled={busy === "list"} className="self-end" onClick={handleLoadOwnerNotes}>
            加载店主反馈 ({count})
          </Button>
        </div>

        <div className="space-y-3">
          {notes.length ? notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
              <p className="text-sm leading-6 text-violet-50/78">{note.content}</p>
              <p className="mt-2 text-xs text-violet-100/45">{note.visitor_nickname} · {note.created_at}</p>
              <Button type="button" size="sm" variant="secondary" className="mt-3" disabled={busy === note.id} onClick={() => handleDeleteNote(note.id)}>
                删除反馈
              </Button>
            </div>
          )) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-violet-100/62">
              暂无已加载反馈。点击加载后，仅店主可见的回访反馈会显示在这里。
            </p>
          )}
        </div>

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function PlaceHomePanel({ space }: { space: Space }) {
  const [ownerId, setOwnerId] = useState(space.owner_id || DEFAULT_OWNER_ID)
  const [memberName, setMemberName] = useState("")
  const [memberType, setMemberType] = useState("silent_member")
  const [memberDescription, setMemberDescription] = useState("")
  const [members, setMembers] = useState<HomeMember[]>(space.home_members || [])
  const [selectedMemberId, setSelectedMemberId] = useState((space.home_members || [])[0]?.id || "")
  const [targetSpaceId, setTargetSpaceId] = useState("")
  const [relationType, setRelationType] = useState("school_enrollment")
  const [pendingRelationships, setPendingRelationships] = useState<PlaceRelationship[]>(space.pending_place_relationships || space.pending_school_enrollments || [])
  const [schoolMembers, setSchoolMembers] = useState(space.school_members || [])
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const isHome = space.place_type === "home"
  const isSchool = space.place_type === "school"
  const hasTargetRelationships = Boolean((space.target_place_relationships || space.pending_place_relationships || []).length)

  async function handleAddMember() {
    setBusy("member")
    setMessage("")
    try {
      const payload = await addHomeMember(
        space.id,
        { name: memberName, display_name: memberName, member_type: memberType, description: memberDescription },
        ownerId,
      )
      setMembers(payload.members || [])
      setSelectedMemberId(payload.member?.id || selectedMemberId)
      setMemberName("")
      setMemberDescription("")
      setMessage("家庭成员已保存；非对话成员会保持沉默。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleCreateRelationship() {
    setBusy("enroll")
    setMessage("")
    try {
      const draft = normalizePlaceRelationshipDraft({
        member_id: selectedMemberId,
        target_space_id: targetSpaceId,
        relation_type: relationType,
      })
      const payload = relationType === "school_enrollment" ? await createSchoolEnrollment(
        space.id,
        { member_id: selectedMemberId, school_space_id: draft.target_space_id },
        ownerId,
      ) : await createPlaceRelationship(
        space.id,
        draft,
        ownerId,
      )
      setMessage(payload.relationship.status === "approved" ? "同主人地点关系已同步。" : "已提交目标地点审批，批准前不会公开展示。")
      setTargetSpaceId("")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleDecision(relationship: PlaceRelationship, status: "approved" | "rejected") {
    setBusy(relationship.id)
    setMessage("")
    try {
      const payload = await decidePlaceRelationship(space.id, relationship.id, { status }, ownerId)
      setPendingRelationships((current) => current.filter((item) => item.id !== relationship.id))
      if (payload.relationship.status === "approved" && payload.relationship.relation_type === "school_enrollment") {
        setSchoolMembers((current) => [
          ...current,
          {
            relationship_id: payload.relationship.id,
            home_space_id: payload.relationship.source_space_id,
            member_id: payload.relationship.source_member_id,
            display_name: payload.relationship.display_name || payload.relationship.source_member_id,
            member_type: "silent_member",
          },
        ])
      }
      setMessage(status === "approved" ? "已批准入学关系。" : "已拒绝入学关系。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  if (!isHome && !isSchool && !hasTargetRelationships) return null

  return (
    <Card className="mt-6 min-w-0 overflow-hidden border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <CardTitle>{isHome ? "Home 成员与地点关系" : isSchool ? "学校成员审批" : "地点关系审批"}</CardTitle>
        <CardDescription className="mt-2">
          {isHome
            ? "Home 是受控真实坐标空间。家庭成员默认不对话；学生-学校只是关系类型之一，送往其他地点也会先生成审批关系。"
            : isSchool
              ? "学校只展示已批准的成员摘要；跨主人入学必须由学校主人批准。"
              : "目标地点只处理店主可见的待审批关系；这不是好友、私信或公开社交图谱。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="space-y-1.5 text-sm">
          <span className="text-violet-100/65">店主标识</span>
          <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
        </label>

        {isHome ? (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">成员名称</span>
                <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="小石头 / 孩子 / 宠物 / 纪念物" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">成员类型</span>
                <select value={memberType} onChange={(event) => setMemberType(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="silent_member">silent_member</option>
                  <option value="display_object">display_object</option>
                  <option value="conversational_character">conversational_character</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="text-violet-100/65">描述</span>
                <input value={memberDescription} onChange={(event) => setMemberDescription(event.target.value)} placeholder="主人确认的展示描述，不自动生成人格。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <Button type="button" disabled={!memberName.trim() || busy === "member"} className="md:col-span-2" onClick={handleAddMember}>
                添加 Home 成员
              </Button>
            </div>

            <div className="grid gap-2">
              {members.length ? members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/72">
                  <span className="font-bold text-white">{member.display_name || member.name}</span>
                  <span className="ml-2 text-xs text-violet-100/50">{member.member_type} · {member.speech_mode}</span>
                </div>
              )) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-100/62">还没有 Home 成员。</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">送去学校的成员</span>
                <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.display_name || member.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">关系类型</span>
                <select value={relationType} onChange={(event) => setRelationType(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  {PLACE_RELATIONSHIP_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="text-violet-100/65">目标地点 Space ID</span>
                <input value={targetSpaceId} onChange={(event) => setTargetSpaceId(event.target.value)} placeholder="space_xxx" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <Button type="button" disabled={!selectedMemberId || !targetSpaceId.trim() || busy === "enroll"} className="md:col-span-2" onClick={handleCreateRelationship}>
                创建地点关系
              </Button>
            </div>
          </>
        ) : null}

        {isSchool || hasTargetRelationships ? (
          <>
            <div className="grid gap-2">
              <p className="text-sm font-black text-white">已批准成员 ({schoolMembers.length})</p>
              {schoolMembers.length ? schoolMembers.map((member) => (
                <div key={member.relationship_id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/72">
                  <span className="font-bold text-white">{member.display_name}</span>
                  <span className="ml-2 text-xs text-violet-100/50">{member.member_type}</span>
                </div>
              )) : <p className="text-sm text-violet-100/55">暂无已批准成员。</p>}
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-black text-white">待审批 ({pendingRelationships.length})</p>
              {pendingRelationships.map((relationship) => (
                <div key={relationship.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{relationship.display_name || relationship.source_member_id}</p>
                    <p className="text-xs text-violet-100/50">{relationship.relation_type} · {relationship.source_space_id} → {relationship.target_space_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy === relationship.id} onClick={() => handleDecision(relationship, "approved")}>批准</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy === relationship.id} onClick={() => handleDecision(relationship, "rejected")}>拒绝</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function TerritoryOwnerPanel({ space }: { space: Space }) {
  const [activeTab, setActiveTab] = useState<"manage" | "claim">("manage")
  const [refreshKey, setRefreshKey] = useState(0)

  function handleClaimSuccess() {
    setActiveTab("manage")
    setRefreshKey((k) => k + 1)
  }

  return (
    <Card className="min-w-0 overflow-hidden border-emerald-300/18 bg-emerald-300/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100/62">Territory management</p>
            <CardTitle>领地管理</CardTitle>
            <CardDescription className="mt-2">
              申领和管理你的领地。领地占用地图空间，同类型领地不可重叠。
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("manage")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                activeTab === "manage"
                  ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/5 text-emerald-100/60 hover:border-emerald-400/40"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              管理
            </button>
            <button
              onClick={() => setActiveTab("claim")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                activeTab === "claim"
                  ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-100"
                  : "border-white/20 bg-white/5 text-emerald-100/60 hover:border-emerald-400/40"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              申领
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "manage" ? (
          <TerritoryManagementPanel
            key={refreshKey}
            userId={space.owner_id || DEFAULT_OWNER_ID}
            onTerritoryChange={(territory) => {
              // Territory changed, could trigger map refresh
              console.log("Territory changed:", territory)
            }}
          />
        ) : (
          <TerritoryClaimPanel
            userId={space.owner_id || DEFAULT_OWNER_ID}
            spaceId={space.id}
            initialLat={space.lat}
            initialLon={space.lon}
            onClaimSuccess={handleClaimSuccess}
            onCancel={() => setActiveTab("manage")}
          />
        )}
      </CardContent>
    </Card>
  )
}

function StateCardOwnerPanel({ space }: { space: Space }) {
  const [open, setOpen] = useState(false)
  const ownerId = space.owner_id || DEFAULT_OWNER_ID

  return (
    <Card data-owner-state-card-entry="management-route" className="min-w-0 overflow-hidden border-violet-300/18 bg-violet-300/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-100/62">Canon Ledger</p>
            <CardTitle>状态卡正史审核</CardTitle>
            <CardDescription className="mt-2">
              AI 和访客对话只能提出候选变化；店主确认后才会写入结构化正史。这里复用状态卡服务，不在访客页公开展示。
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
            <BookOpen className="h-4 w-4" />
            查看状态卡
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/70">
            范围：<span className="font-bold text-white">本空间</span>
          </span>
          <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/70">
            决策：<span className="font-bold text-white">加入正史 / 忽略</span>
          </span>
          <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/70">
            Owner：<span className="font-bold text-white">{ownerId}</span>
          </span>
        </div>
      </CardContent>
      {open ? <OwnerStateCardPanel space={space} ownerId={ownerId} onClose={() => setOpen(false)} /> : null}
    </Card>
  )
}

function NpcSimulationOverview({ characters, spaceName }: { characters: SpaceCharacter[]; spaceName?: string }) {
  const charsNeedingAttention = characters.filter((c) => {
    const s = c.simulation_state
    if (!s) return false
    return s.energy < 30 || s.hunger < 30 || s.thirst < 30 || s.social < 30 || s.entertainment < 30
  })

  return (
    <Card className="min-w-0 overflow-hidden border-amber-300/18 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_34%),rgba(15,23,42,0.74)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-300/80" />
          <CardTitle className="text-base">NPC 仿真状态监控</CardTitle>
        </div>
        <CardDescription className="mt-1">
          五维状态实时追踪 — 能量、饱腹、水分、社交、娱乐。NPC 会根据需求自主移动到匹配的空间。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {characters.length === 0 ? (
          <p className="text-sm text-violet-100/50">当前空间暂无 NPC。添加角色后，仿真系统将自动追踪状态。</p>
        ) : (
          <div className="space-y-5">
            {charsNeedingAttention.length > 0 && (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
                <p className="text-xs font-bold text-amber-100/80">
                  ⚠️ {charsNeedingAttention.length} 位 NPC 状态偏低
                </p>
                <p className="mt-1 text-xs text-amber-100/60">
                  {charsNeedingAttention.map((c) => c.name).join("、")} 可能正在寻找合适的场所补充需求。
                </p>
              </div>
            )}
            {characters.map((char) => (
              <div key={char.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-3">
                  {char.avatar ? (
                    <img src={char.avatar} alt={char.name} className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-sm font-black text-white">
                      {char.name?.[0] || "?"}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-white">{char.name}</p>
                    <p className="text-xs text-violet-100/50">
                      {char.is_visitor ? "🚶 外来访客" : char.current_space_id !== char.home_space_id ? "🚶 外出中" : "🏠 驻场"}
                      {char.traits?.length ? ` · ${char.traits.length} 个特质` : ""}
                    </p>
                  </div>
                </div>
                <NpcSimulationStatusPanel character={char} variant="full" spaceName={spaceName} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SpaceOwnerManagement({
  space,
  roleplay,
}: {
  space: Space
  roleplay: RoleplayState | null
}) {
  const characters = Array.isArray(space.characters) ? space.characters : []
  const [roleplayState, setRoleplayState] = useState<RoleplayState | null>(roleplay)
  const effectiveRoleplay = roleplayState || fallbackRoleplayState(space, characters)

  return (
    <div data-owner-only-panel data-space-owner-management-panels className="space-y-5">
      <Card className="min-w-0 overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),rgba(15,23,42,0.74)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/62">店主管理</p>
              <CardTitle>这里专门处理空间管理</CardTitle>
              <CardDescription className="mt-2">
                访客聊天、密码入场和 NPC 对话保留在访客视角；这里只放店主需要处理的事项。
              </CardDescription>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <UserCheck className="h-3.5 w-3.5" />
              店主身份：{space.owner_id || "未确认"}
            </span>
          </div>
        </CardHeader>
      </Card>

      <RoleplayPanel
        space={space}
        characters={characters}
        roleplay={effectiveRoleplay}
        onRoleplayChange={setRoleplayState}
      />

      {/* ── NPC 仿真状态监控 ─────────────────────────────────────────────── */}
      <NpcSimulationOverview characters={characters} spaceName={space.name} />

      <PlayPackPanel space={space} />
      <PlaceHomePanel space={space} />
      <TerritoryOwnerPanel space={space} />
      <StateCardOwnerPanel space={space} />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <SpaceCapabilityHubPanel space={space} />
      </div>
      <RelationshipGraphPanel space={space} characters={characters} />
      <OwnerVisitorNotesPanel space={space} />
    </div>
  )
}

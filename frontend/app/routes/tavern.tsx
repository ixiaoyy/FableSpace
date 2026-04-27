import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, CheckCircle2, Copy, DoorOpen, MapPinned, MessageSquareText, ScrollText, Send, Share2, ShieldCheck, UserCheck, UsersRound, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useLoaderData } from "react-router"

import memoryModuleImage from "../assets/homepage-reference/modules/memory-module.png"
import npcDialogueImage from "../assets/homepage-reference/modules/npc-dialogue.png"
import { TavernChat } from "../features/tavern-chat"
import { TavernNpcStage } from "../features/tavern-npc-stage"
import { buildCreatorConversionLink } from "../lib/creator-conversion.js"
import { buildTavernShareDisplay, buildTavernSharePayload } from "../lib/tavern-share.js"
import {
  DEFAULT_OWNER_ID,
  DEFAULT_VISITOR_ID,
  decideRoleplayClaim,
  errorMessage,
  getRoleplayState,
  getTavern,
  getTavernShare,
  requestRoleplayClaim,
  saveRoleplayConfig,
  type RoleplayClaim,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
  type TavernSharePayload,
} from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernLoaderData = {
  tavernId: string
  tavern: Tavern | null
  roleplay: RoleplayState | null
  error: string
}

const capabilityCards = [
  { icon: UsersRound, title: "角色", text: "SillyTavern 兼容 NPC 卡" },
  { icon: MessageSquareText, title: "对话", text: "AI 驱动的酒馆互动" },
  { icon: ScrollText, title: "记忆", text: "对话写回与回访反馈" },
]

export async function clientLoader({ params }: ClientLoaderFunctionArgs): Promise<TavernLoaderData> {
  const tavernId = params.tavernId ?? ""
  if (!tavernId) {
    return { tavernId, tavern: null, roleplay: null, error: "缺少酒馆 ID" }
  }
  try {
    const tavern = await getTavern(tavernId, DEFAULT_VISITOR_ID)
    let roleplay: RoleplayState | null = null
    try {
      roleplay = await getRoleplayState(tavernId, DEFAULT_VISITOR_ID)
    } catch {
      roleplay = null
    }
    return { tavernId, tavern, roleplay, error: "" }
  } catch (error) {
    return { tavernId, tavern: null, roleplay: null, error: errorMessage(error) }
  }
}

function fallbackRoleplayState(tavern: Tavern, characters: TavernCharacter[]): RoleplayState {
  return {
    tavern_id: tavern.id,
    roleplay_mode: tavern.roleplay_mode || "ai_only",
    claims: tavern.character_claims || [],
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      avatar: character.avatar,
    })),
  }
}

function characterName(characters: TavernCharacter[], characterId: string) {
  return characters.find((character) => character.id === characterId)?.name || characterId
}

function RoleplayPanel({
  tavern,
  characters,
  roleplay,
  onRoleplayChange,
}: {
  tavern: Tavern
  characters: TavernCharacter[]
  roleplay: RoleplayState
  onRoleplayChange: (state: RoleplayState) => void
}) {
  const [ownerId, setOwnerId] = useState(tavern.owner_id || DEFAULT_OWNER_ID)
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
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Player NPC roleplay</CardTitle>
            <CardDescription className="mt-2">
              Mode: <span className="font-bold text-cyan-100">{roleplay.roleplay_mode}</span> · Approved: {approvedClaims.length} · Pending: {pendingClaims.length}
            </CardDescription>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
            <UserCheck className="h-3.5 w-3.5" />
            Tavern scoped
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Owner ID</span>
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
            className="md:col-span-2"
            onClick={() => run("mode", () => saveRoleplayConfig(tavern.id, { roleplay_mode: mode }, ownerId), "Roleplay mode saved.")}
          >
            <ShieldCheck className="h-4 w-4" />
            Save mode
          </Button>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Visitor ID</span>
            <input value={visitorId} onChange={(event) => setVisitorId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Player name</span>
            <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm md:col-span-2">
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
            className="md:col-span-2"
            onClick={() => run("claim", () => requestRoleplayClaim(tavern.id, { character_id: characterId, player_name: playerName }, visitorId), "Claim request sent.")}
          >
            <Send className="h-4 w-4" />
            Request claim
          </Button>
        </div>

        {claims.length ? (
          <div className="space-y-2">
            {claims.map((claim: RoleplayClaim) => (
              <div key={claim.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-white">{characterName(characters, claim.character_id)} · {claim.player_name || claim.player_id}</p>
                  <p className="mt-1 text-xs text-violet-100/55">{claim.status} · {claim.id}</p>
                </div>
                {claim.status === "pending" ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(tavern.id, claim.id, { status: "approved" }, ownerId), "Claim approved.")}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(tavern.id, claim.id, { status: "rejected" }, ownerId), "Claim rejected.")}>
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

function TavernShareCard({ tavern }: { tavern: Tavern }) {
  const [copyStatus, setCopyStatus] = useState("")
  const [shareStatus, setShareStatus] = useState("正在同步公开分享信息…")
  const [serverSharePayload, setServerSharePayload] = useState<TavernSharePayload | null>(null)
  const fallbackSharePayload = useMemo(
    () => buildTavernSharePayload(tavern, {
      origin: typeof window !== "undefined" ? window.location.origin : "",
    }),
    [tavern],
  )
  const sharePayload = useMemo(
    () => (serverSharePayload ? buildTavernShareDisplay(serverSharePayload) : fallbackSharePayload),
    [fallbackSharePayload, serverSharePayload],
  )

  useEffect(() => {
    let cancelled = false
    setShareStatus("正在同步公开分享信息…")
    setServerSharePayload(null)

    getTavernShare(tavern.id, DEFAULT_VISITOR_ID)
      .then((payload) => {
        if (cancelled) return
        setServerSharePayload(payload)
        setShareStatus("")
      })
      .catch(() => {
        if (cancelled) return
        setShareStatus("当前使用本地邀请文案；公开分享接口暂不可用。")
      })

    return () => {
      cancelled = true
    }
  }, [tavern.id])

  async function handleCopyShareText() {
    setCopyStatus("")
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setCopyStatus("当前浏览器不支持自动复制，请手动选中文案复制。")
        return
      }
      await navigator.clipboard.writeText(sharePayload.copyText)
      setCopyStatus("已复制邀请文案。")
    } catch {
      setCopyStatus("当前浏览器不允许自动复制，请手动选中文案复制。")
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-cyan-200" />
              邀请链接
            </CardTitle>
            <CardDescription className="mt-2">
              复制当前酒馆入口给朋友或社群。文案只使用店主公开填写的信息，不生成或改写酒馆内容。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={handleCopyShareText}>
            <Copy className="h-4 w-4" />
            复制邀请
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold text-white">{sharePayload.title}</p>
          <p className="mt-2 text-sm leading-6 text-violet-50/70">{sharePayload.summary}</p>
          <p className="mt-3 break-all rounded-2xl bg-slate-950/45 px-3 py-2 text-xs text-cyan-100">
            {sharePayload.url}
          </p>
        </div>
        <textarea
          readOnly
          value={sharePayload.copyText}
          rows={4}
          className="w-full resize-none rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-violet-50 outline-none focus:border-cyan-300/60"
          aria-label="酒馆邀请文案"
        />
        {shareStatus ? <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/64">{shareStatus}</p> : null}
        {copyStatus ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{copyStatus}</p> : null}
      </CardContent>
    </Card>
  )
}

function CreatorConversionCard({ tavern }: { tavern: Tavern }) {
  const createLink = useMemo(() => buildCreatorConversionLink(tavern), [tavern])

  return (
    <Card className="min-w-0 overflow-hidden border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <CardTitle>也在附近开一间自己的酒馆</CardTitle>
        <CardDescription className="mt-2">
          只带入这处真实空间锚点的坐标/地址，不复制原酒馆名称、简介、角色或场景内容。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-violet-50/72">
          如果这间酒馆让你有了灵感，可以用同一片现实区域开一间属于自己的赛博酒馆；内容仍由你自己确认。
        </p>
        <Button asChild>
          <Link to={createLink}>
            开自己的酒馆
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function TavernRoute() {
  const { tavernId, tavern, roleplay, error } = useLoaderData<typeof clientLoader>()
  const characters = tavern?.characters || []
  const [selectedCharacterId, setSelectedCharacterId] = useState("")
  const [roleplayState, setRoleplayState] = useState<RoleplayState | null>(roleplay)
  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId) || characters[0]
  const effectiveRoleplay = tavern ? roleplayState || fallbackRoleplayState(tavern, characters) : null

  return (
    <ProductShell eyebrow="Tavern">
      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch">
        <Card className="relative min-w-0 overflow-hidden p-0">
          <img src={npcDialogueImage} alt="酒馆入口氛围" className="absolute inset-0 h-full w-full object-cover opacity-42" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#050615]/96 via-[#050615]/78 to-[#050615]/38" />
          <div className="relative p-6 sm:p-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
              <DoorOpen className="h-3.5 w-3.5" />
              Tavern entrance
            </div>
            <CardHeader className="mb-6">
              <CardTitle className="text-3xl font-black sm:text-4xl">{tavern?.name || "酒馆入口"}</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                {tavern?.description || `目标酒馆 ID：${tavernId || "未指定"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-7 text-violet-100/72">
              {error ? (
                <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-red-100">加载失败：{error}</p>
              ) : null}
              {tavern ? (
                <>
                  <p className="rounded-3xl border border-white/10 bg-slate-950/58 p-4 backdrop-blur-md">
                    {tavern.scene_prompt || "店主还没有写下场景提示。"}
                  </p>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <MapPinned className="mb-3 h-5 w-5 text-cyan-200" />
                      <p className="text-xs text-violet-100/45">坐标</p>
                      <p className="mt-1 break-words font-bold text-white">{Number(tavern.lat).toFixed(5)}, {Number(tavern.lon).toFixed(5)}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <ShieldCheck className="mb-3 h-5 w-5 text-fuchsia-100" />
                      <p className="text-xs text-violet-100/45">状态 / 访问</p>
                      <p className="mt-1 break-words font-bold text-white">{tavern.status || "unknown"} · {tavern.access || "public"}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <ScrollText className="mb-3 h-5 w-5 text-cyan-200" />
                      <p className="text-xs text-violet-100/45">回访次数</p>
                      <p className="mt-1 font-bold text-white">{tavern.visit_count ?? 0}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </div>
        </Card>

        <div className="grid min-w-0 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {capabilityCards.map((item) => (
            <Card key={item.title} className="relative min-h-48 min-w-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(0,214,201,0.16),transparent_10rem)]" />
              <div className="relative">
                <item.icon className="mb-5 h-7 w-7 text-cyan-200" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-3">{item.text}</CardDescription>
              </div>
            </Card>
          ))}
          <Card className="relative min-w-0 overflow-hidden sm:col-span-3 lg:col-span-1 xl:col-span-3">
            <img src={memoryModuleImage} alt="记忆写回模块" className="absolute inset-0 h-full w-full object-cover opacity-28" loading="lazy" decoding="async" />
            <div className="relative max-w-2xl">
              <CardTitle>回访反馈</CardTitle>
              <CardDescription className="mt-3">
                访客状态、关系阶段与对话历史会成为下一次进入酒馆时的上下文。敏感配置仍由店主侧保管。
              </CardDescription>
            </div>
          </Card>
        </div>
      </section>

      {tavern ? (
        <section className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          <div className="min-w-0 space-y-6">
            <TavernNpcStage
              tavern={tavern}
              characters={characters}
              selectedCharacterId={selectedCharacter?.id}
              roleplayMode={effectiveRoleplay?.roleplay_mode}
              claims={effectiveRoleplay?.claims}
              onSelectCharacter={(character: TavernCharacter) => setSelectedCharacterId(character.id)}
            />
            {effectiveRoleplay ? (
              <RoleplayPanel
                tavern={tavern}
                characters={characters}
                roleplay={effectiveRoleplay}
                onRoleplayChange={setRoleplayState}
              />
            ) : null}
            <TavernShareCard tavern={tavern} />
            <CreatorConversionCard tavern={tavern} />
          </div>

          <TavernChat key={selectedCharacter?.id || "no-character"} tavern={tavern} character={selectedCharacter} />
        </section>
      ) : null}
    </ProductShell>
  )
}

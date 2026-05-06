import {
  Bot,
  ChevronDown,
  DoorOpen,
  LockKeyhole,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"

import { normalizePublicWelfareNpcAssetPath } from "../../lib/tavern-runtime-config.js"
import { GENDER_OPTIONS, genderLabel, normalizeGender } from "../../lib/gender.js"
import {
  enterTavern,
  errorMessage,
  getTavernChatHistory,
  sendTavernChat,
  type ChatMessage,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
} from "../../lib/taverns"
import { Button } from "../../ui/button"

type TavernChatWorkbenchProps = {
  tavern: Tavern
  roleplay?: RoleplayState | null
  currentUserId: string
  isOwner: boolean
  publicPanel?: ReactNode
}

type DetailSectionProps = {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

const CHAT_HISTORY_LIMIT = 80
function DetailSection({ title, description, defaultOpen = false, children }: DetailSectionProps) {
  return (
    <details className="group rounded-3xl border border-white/10 bg-white/[0.04] p-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-sm font-black text-white">{title}</span>
          {description ? <span className="mt-1 block text-xs leading-5 text-violet-100/58">{description}</span> : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-cyan-100 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  )
}

function textOrFallback(value: unknown, fallback = "未填写") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function avatarSource(character: TavernCharacter | undefined) {
  if (!character) return ""
  if (character.avatar) return normalizePublicWelfareNpcAssetPath(character.avatar)
  if (character.image_url) return normalizePublicWelfareNpcAssetPath(character.image_url)
  const sprites = character.sprites || {}
  return normalizePublicWelfareNpcAssetPath(sprites.neutral || sprites.default || Object.values(sprites)[0] || "")
}


function canRenderImage(src: string) {
  return /^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith("data:")
}

function characterGreeting(character: TavernCharacter | undefined, tavernName: string): ChatMessage[] {
  if (!character) return []
  const content = String(character.first_mes || "").trim() || `欢迎来到${tavernName}，我是 ${character.name || "这里的 NPC"}。想聊什么都可以直接输入。`
  return [
    {
      role: "assistant",
      character_id: character.id,
      content,
    },
  ]
}

function characterStageSummary(character: TavernCharacter | undefined, tavernName: string) {
  if (!character) return `${tavernName} 还没有可展示的当前 NPC。`
  return textOrFallback(
    character.description || character.personality || character.scenario || character.first_mes,
    "店主还没有写下这位 NPC 的公开简介；可以先用第一句话开始认识 TA。",
  )
}

function formatChatTime(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

function formatCoordinate(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return value.toFixed(5)
}

function accessLabel(access?: string) {
  const value = String(access || "public")
  if (value === "private") return "私密"
  if (value === "password") return "密码"
  return "公开"
}

function roleplayModeLabel(mode?: string) {
  return mode === "hybrid" ? "AI + 玩家扮演" : "AI NPC"
}

function responseModeLabel(tavern: Tavern) {
  const llmConfig = (tavern.llm_config || {}) as Record<string, unknown>
  const backend = String(llmConfig.backend || "").trim().toLowerCase()
  if (["rules", "rule_based", "public_welfare"].includes(backend)) {
    return {
      kind: "rules",
      label: "规则模式 / 无 Key 轻量接待",
      title: "这间内置公益酒馆使用本地规则模板接待，不会伪装成外部 LLM。",
    }
  }
  if (tavern.status === "closed" && backend !== "rules" && backend !== "rule_based" && backend !== "public_welfare") {
    return {
      kind: "missing",
      label: "AI 后端未开放或未配置",
      title: "店主需要开放酒馆并配置、测试模型后，NPC 才能以外部 LLM 接待。",
    }
  }
  return {
    kind: "llm",
    label: "外部 LLM 模式",
    title: "当前按店主配置的外部 LLM 进行 NPC 对话。",
  }
}

function WorkbenchChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-violet-50/72">
      {children}
    </span>
  )
}

function CharacterStagePortrait({ character }: { character?: TavernCharacter }) {
  const src = avatarSource(character)
  if (src && canRenderImage(src)) {
    return (
      <img
        src={src}
        alt={character?.name || "NPC avatar"}
        className="h-24 w-24 shrink-0 rounded-[1.4rem] border border-cyan-100/18 object-cover shadow-2xl shadow-cyan-950/35 ring-1 ring-cyan-200/45 sm:h-28 sm:w-28"
      />
    )
  }

  return (
    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] border border-cyan-100/18 bg-gradient-to-br from-cyan-300/18 via-violet-300/10 to-fuchsia-300/16 text-3xl font-black text-cyan-50 shadow-2xl shadow-cyan-950/35 ring-1 ring-cyan-200/45 sm:h-28 sm:w-28">
      {src || (character?.name || "?").slice(0, 1)}
    </span>
  )
}

function CharacterAvatar({ character, active }: { character?: TavernCharacter; active?: boolean }) {
  const src = avatarSource(character)
  if (src && canRenderImage(src)) {
    return (
      <img
        src={src}
        alt={character?.name || "NPC avatar"}
        className={`h-12 w-12 rounded-2xl object-cover ring-1 ${active ? "ring-cyan-200/60" : "ring-white/12"}`}
      />
    )
  }

  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black ring-1 ${
        active ? "bg-cyan-300/18 text-cyan-50 ring-cyan-200/60" : "bg-white/[0.06] text-violet-50 ring-white/12"
      }`}
    >
      {src || (character?.name || "?").slice(0, 1)}
    </span>
  )
}

function NpcSeatGallery({
  characters,
  selectedCharacterId,
  onSelectCharacter,
}: {
  characters: TavernCharacter[]
  selectedCharacterId: string
  onSelectCharacter: (characterId: string) => void
}) {
  if (!characters.length) return null

  return (
    <div data-npc-seat-gallery aria-label="NPC 吧台席位" className="mb-4 rounded-3xl border border-white/10 bg-slate-950/32 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">今晚在场</p>
        <span className="text-[0.68rem] font-semibold text-violet-100/45">点击席位切换</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {characters.map((character) => {
          const src = avatarSource(character)
          const active = character.id === selectedCharacterId
          return (
            <button
              key={`seat-${character.id}`}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCharacter(character.id)}
              className={`group min-w-[4.4rem] rounded-2xl border p-1.5 text-left transition hover:border-cyan-300/45 hover:bg-cyan-300/8 ${
                active ? "border-cyan-300/55 bg-cyan-300/12" : "border-white/10 bg-white/[0.04]"
              }`}
            >
              {src && canRenderImage(src) ? (
                <img src={src} alt={character.name || "NPC 头像"} className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/12" loading="lazy" decoding="async" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/[0.06] text-lg font-black text-white ring-1 ring-white/12">
                  {(character.name || character.id || "?").slice(0, 1)}
                </span>
              )}
              <span className="mt-1 block max-w-14 truncate text-[0.66rem] font-bold text-violet-50/70">{character.name || character.id}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function conversationScene(tavern: Tavern, character: TavernCharacter | undefined) {
  return textOrFallback(
    tavern.scene_prompt || tavern.description || character?.scenario || character?.description,
    "这里还没有额外场景线索；可以直接向 NPC 打招呼，让 TA 带你进入当前氛围。",
  )
}

function conversationStarters(character: TavernCharacter | undefined, tavern: Tavern) {
  const name = character?.name || "你"
  const place = tavern.name || "这里"
  return [
    `${name}，我刚到${place}，现在可以从哪里聊起？`,
    "这里现在最需要我知道的一件事是什么？",
    "我第一次来这里，最适合先观察什么？",
  ]
}

function ChatConversationSidecar({
  tavern,
  character,
  visitorName,
}: {
  tavern: Tavern
  character?: TavernCharacter
  visitorName: string
}) {
  const starters = conversationStarters(character, tavern)
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/8 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/62">正在对话</p>
        <p className="mt-1 leading-6 text-cyan-50">
          你正在和 <span className="font-black text-white">{character?.name || "NPC"}</span> 聊天。
          <span className="text-cyan-50/70"> 当前身份是 {visitorName || "旅人"}。</span>
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/45">当前场景</p>
        <p className="mt-2 line-clamp-5 leading-6 text-violet-50/70">{conversationScene(tavern, character)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/45">可以这样开口</p>
        <div className="mt-2 space-y-2">
          {starters.map((starter) => (
            <p key={starter} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 leading-6 text-violet-50/68">
              {starter}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TavernChatWorkbench({
  tavern,
  roleplay,
  currentUserId,
  isOwner,
  publicPanel,
}: TavernChatWorkbenchProps) {
  const characters = useMemo(() => (Array.isArray(tavern.characters) ? tavern.characters : []), [tavern.characters])
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id || "")
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0],
    [characters, selectedCharacterId],
  )
  const [visitorId] = useState(currentUserId)
  const [visitorName, setVisitorName] = useState(isOwner ? "店主" : "旅人")
  const [visitorGender, setVisitorGender] = useState("unspecified")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [password, setPassword] = useState("")
  const [hasEnteredPasswordTavern, setHasEnteredPasswordTavern] = useState(false)
  const [busy, setBusy] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const chatLogRef = useRef<HTMLDivElement | null>(null)

  const access = String(tavern.access || "public")
  const passwordLocked = access === "password" && !isOwner && !hasEnteredPasswordTavern
  const visibleMessages = messages.length ? messages : characterGreeting(selectedCharacter, tavern.name)
  const roleplayMode = roleplay?.roleplay_mode || tavern.roleplay_mode || "ai_only"
  const responseMode = responseModeLabel(tavern)

  useEffect(() => {
    if (characters.length && !characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].id)
    }
  }, [characters, selectedCharacterId])

  useEffect(() => {
    if (access === "password" && isOwner) {
      setHasEnteredPasswordTavern(true)
      setNotice("店主身份已进入访客预览；配置与审批请从专用管理页进入。")
      return
    }
    if (access === "password") return

    let cancelled = false
    setNotice("")
    enterTavern(tavern.id, "", visitorId, visitorGender)
      .then((result) => {
        if (cancelled) return
        if (result.first_mes) setNotice("已进入酒馆，可以开始和 NPC 聊天。")
      })
      .catch((err) => {
        if (cancelled) return
        setNotice(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [access, isOwner, tavern.id, visitorId])

  useEffect(() => {
    if (!selectedCharacter || passwordLocked) {
      setMessages([])
      return
    }

    let cancelled = false
    getTavernChatHistory(tavern.id, visitorId, selectedCharacter.id, visitorId, CHAT_HISTORY_LIMIT)
      .then((payload) => {
        if (cancelled) return
        setMessages(payload.messages || [])
      })
      .catch(() => {
        if (cancelled) return
        setMessages([])
      })
    return () => {
      cancelled = true
    }
  }, [passwordLocked, selectedCharacter, tavern.id, visitorId])

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, busy])

  async function handlePasswordEnter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password.trim()) return
    setBusy("enter")
    setError("")
    setNotice("")
    try {
      const result = await enterTavern(tavern.id, password.trim(), visitorId, visitorGender)
      setHasEnteredPasswordTavern(true)
      setPassword("")
      setNotice(result.first_mes ? "密码通过，已进入酒馆。" : "密码通过。")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy("")
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const cleanMessage = message.trim()
    if (!selectedCharacter || !cleanMessage || passwordLocked) return

    const now = new Date().toISOString()
    const userLine: ChatMessage = {
      id: `local-user-${now}`,
      role: "user",
      content: cleanMessage,
      character_id: selectedCharacter.id,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_gender: visitorGender,
      timestamp: now,
    }
    setMessages((current) => [...current, userLine])
    setMessage("")
    setBusy("send")
    setError("")
    setNotice("")

    try {
      const result = await sendTavernChat(tavern.id, {
        character_id: selectedCharacter.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        message: cleanMessage,
      })
      const assistantTime = new Date().toISOString()
      setMessages((current) => [
        ...current,
        {
          id: `local-assistant-${assistantTime}`,
          role: "assistant",
          content: result.response,
          character_id: selectedCharacter.id,
          visitor_id: visitorId,
          timestamp: assistantTime,
        },
      ])
      if (result.response_mode?.message && result.response_mode.kind !== "owner_llm") {
        setNotice(result.response_mode.message)
      } else if (result.degradation?.message) {
        setNotice(result.degradation.message)
      } else if (result.degraded) {
        setNotice("当前为降级回复；店主可在管理页检查模型配置。")
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy("")
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    void handleSubmit()
  }

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId)
    setError("")
    setNotice("")
  }

  return (
    <section data-chat-workbench="sillytavern-style" className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/72 shadow-2xl shadow-cyan-950/20">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_36%),rgba(15,23,42,0.92)] p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">
                <Sparkles className="h-4 w-4" />
                Cyber tavern chat
              </p>
              <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{tavern.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-50/70">
                {textOrFallback(tavern.description, "选择 NPC 后，直接在底部输入框开始聊天。酒馆资料和其它公开功能已折叠在下方。")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WorkbenchChip>
                <DoorOpen className="h-3.5 w-3.5 text-cyan-200" />
                {textOrFallback(tavern.status, "unknown")} · {accessLabel(tavern.access)}
              </WorkbenchChip>
              <WorkbenchChip>
                <MapPin className="h-3.5 w-3.5 text-cyan-200" />
                {formatCoordinate(tavern.lat)}, {formatCoordinate(tavern.lon)}
              </WorkbenchChip>
              <WorkbenchChip>
                <UsersRound className="h-3.5 w-3.5 text-cyan-200" />
                {characters.length} NPC
              </WorkbenchChip>
              <WorkbenchChip>
                {responseMode.kind === "rules" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-cyan-200" />
                )}
                <span title={responseMode.title}>{responseMode.label}</span>
              </WorkbenchChip>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="border-b border-white/10 bg-white/[0.035] p-4 lg:border-b-0 lg:border-r" aria-label="NPC 角色列表">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-100/45">Characters</p>
                <h2 className="text-base font-black text-white">选择 NPC</h2>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                {characters.length}
              </span>
            </div>
            <NpcSeatGallery
              characters={characters}
              selectedCharacterId={selectedCharacter?.id || selectedCharacterId}
              onSelectCharacter={selectCharacter}
            />
            <div className="space-y-2">
              {characters.length ? (
                characters.map((character) => {
                  const active = character.id === selectedCharacter?.id
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => selectCharacter(character.id)}
                      className={`flex min-h-16 w-full min-w-0 items-center gap-3 rounded-3xl border p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                        active ? "border-cyan-300/45 bg-cyan-300/12" : "border-white/10 bg-slate-950/30"
                      }`}
                    >
                      <CharacterAvatar character={character} active={active} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">{character.name || character.id}</span>
                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-violet-50/56">
                          {character.description || character.personality || character.scenario || "可对话角色"}
                        </span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/35 p-4 text-sm leading-6 text-violet-50/62">
                  这间酒馆还没有 NPC。店主可以在管理入口导入 SillyTavern 兼容角色卡。
                </div>
              )}
            </div>
          </aside>

          <main className="flex min-w-0 flex-col bg-slate-950/35">
            <div className="border-b border-white/10 p-3 sm:p-4">
              <div
                data-current-npc-stage-card
                aria-label="当前 NPC 舞台"
                className="relative overflow-hidden rounded-[1.7rem] border border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.58))] p-3 shadow-xl shadow-cyan-950/12 sm:p-4"
              >
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.16),transparent_45%)]" />
                <div className="relative flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <CharacterStagePortrait character={selectedCharacter} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-cyan-100/68">
                      <Bot className="h-3.5 w-3.5" />
                      当前 NPC 舞台
                    </p>
                    <h2 className="mt-1 break-words text-xl font-black text-white sm:text-2xl">{selectedCharacter?.name || "暂无 NPC"}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-violet-100/62">
                      <span>{selectedCharacter ? roleplayModeLabel(String(roleplayMode)) : "请先添加角色"}</span>
                      {selectedCharacter ? <span>· {genderLabel(selectedCharacter.gender)}</span> : null}
                      {selectedCharacter ? <span className="text-cyan-100/78">· 正在接待你</span> : null}
                    </p>
                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-violet-50/72">
                      {characterStageSummary(selectedCharacter, tavern.name)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-2 md:flex">
                    <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-50">
                      正在接待你
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-violet-50/62">
                      Shift+Enter 换行
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {passwordLocked ? (
              <form onSubmit={handlePasswordEnter} className="m-4 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-amber-100" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-amber-50">这间酒馆需要密码</p>
                    <p className="mt-1 text-sm leading-6 text-amber-50/72">输入店主提供的密码后即可加载聊天记录并开始对话。</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        className="min-h-12 flex-1 rounded-2xl border border-white/12 bg-slate-950/55 px-4 text-white outline-none focus:border-amber-200/70"
                        placeholder="酒馆密码"
                      />
                      <Button type="submit" disabled={busy === "enter" || !password.trim()}>
                        <DoorOpen className="h-4 w-4" />
                        进入酒馆
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ) : null}

            <div
              ref={chatLogRef}
              data-chat-log-compact
              aria-label="聊天记录"
              className="max-h-[min(52vh,34rem)] space-y-4 overflow-y-auto p-4 sm:p-5"
            >
              {visibleMessages.map((line, index) => {
                const isUser = line.role === "user"
                return (
                  <div key={line.id || `${line.role}-${index}`} className={`flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-lg ${
                        isUser
                          ? "rounded-br-md bg-cyan-300/18 text-cyan-50 shadow-cyan-950/20"
                          : "rounded-bl-md border border-white/10 bg-white/[0.07] text-violet-50 shadow-black/20"
                      }`}
                    >
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-violet-100/44">
                        {isUser ? visitorName || visitorId : selectedCharacter?.name || "NPC"}
                        {formatChatTime(line.timestamp) ? <span className="ml-2 font-semibold normal-case tracking-normal">{formatChatTime(line.timestamp)}</span> : null}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{line.content}</p>
                    </div>
                  </div>
                )
              })}
              {busy === "send" ? (
                <div className="flex justify-start">
                  <div className="rounded-[1.35rem] rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-violet-50/68">
                    {selectedCharacter?.name || "NPC"} 正在回复…
                  </div>
                </div>
              ) : null}
            </div>

            {(notice || error) && !passwordLocked ? (
              <div className="border-t border-white/10 px-4 py-3">
                {notice ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">{notice}</p> : null}
                {error ? <p className="mt-2 rounded-2xl border border-red-300/25 bg-red-300/10 p-3 text-sm leading-6 text-red-50">{error}</p> : null}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} data-chat-composer="fast-entry" className="border-t border-white/10 bg-slate-950/80 p-3 sm:p-4">
              <details data-visitor-identity-settings className="mb-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-violet-100/64">
                  <span className="truncate">发言身份：{visitorName || visitorId} · {genderLabel(visitorGender)}</span>
                  <span className="shrink-0 text-cyan-100/72">修改</span>
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <label className="min-w-0">
                    <span className="sr-only">显示名</span>
                    <input
                      value={visitorName}
                      onChange={(event) => setVisitorName(event.target.value)}
                      className="min-h-11 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm text-white outline-none focus:border-cyan-300/60"
                      placeholder="显示名"
                    />
                  </label>
                  <label>
                    <span className="sr-only">性别</span>
                    <select
                      value={visitorGender}
                      onChange={(event) => setVisitorGender(normalizeGender(event.target.value))}
                      className="min-h-11 w-full rounded-2xl border border-white/12 bg-slate-950 px-4 text-sm text-white outline-none focus:border-cyan-300/60"
                    >
                      {GENDER_OPTIONS.map((option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  disabled={!selectedCharacter || busy === "send" || passwordLocked}
                  rows={2}
                  maxLength={1600}
                  placeholder="Type a message，按 Enter 发送；Shift+Enter 换行"
                  className="min-h-14 flex-1 resize-none rounded-3xl border border-white/12 bg-white/[0.06] px-5 py-3 text-sm leading-6 text-white outline-none placeholder:text-violet-100/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                />
                <Button type="submit" disabled={!selectedCharacter || busy === "send" || passwordLocked || !message.trim()} className="min-h-14 sm:w-28">
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </form>

            <section data-chat-sidecar="conversation-context" data-secondary-tools="visitor-folded" className="border-t border-white/10 bg-white/[0.025] p-4">
              <div className="grid gap-3 xl:grid-cols-2">
                <DetailSection title="聊天辅助" description="需要提示时再展开，不占用聊天主线">
                  <ChatConversationSidecar tavern={tavern} character={selectedCharacter} visitorName={visitorName} />
                </DetailSection>

                <DetailSection title="更多酒馆功能" description="分享、公开扩展和回访入口折叠收纳">
                  {publicPanel || (
                    <p className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm leading-6 text-violet-50/62">
                      暂无额外公开功能。
                    </p>
                  )}
                </DetailSection>
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  )
}

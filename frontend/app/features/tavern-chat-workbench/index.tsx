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
import { useSearchParams } from "react-router"

import { normalizePublicWelfareNpcAssetPath } from "../../lib/tavern-runtime-config.js"

import { GENDER_OPTIONS, genderLabel, normalizeGender } from "../../lib/gender.js"
import {
  enterTavern,
  errorMessage,
  sendGroupChat,
  sendTavernChat,
  type ChatMessage,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
} from "../../lib/taverns"
import { Button } from "../../ui/button"
import {
  CONVERSATION_INTENT_CHIPS,
  buildConversationIntentContext,
  buildMessageWithConversationIntent,
  progressSignalsFromChatResult,
  findConversationIntent,
} from "./conversation-beats.js"
import {
  getGameplays,
  startGameplaySession,
  advanceGameplaySession,
  abandonGameplaySession,
  listGameplaySessions,
} from "../../lib/taverns"
import { getMiniGameTemplates } from "../../product/tavernMiniGames"
import OrphanSignalGameplayPanel from "../../product/OrphanSignalGameplayPanel"
import GameplaySessionPanel from "../../product/GameplaySessionPanel"
import { SpaceCapabilityHubPanel } from "../../components/SpaceCapabilityHubPanel"


type ChatChannel = "public" | "private"

type TavernChatWorkbenchProps = {
  tavern: Tavern
  roleplay?: RoleplayState | null
  currentUserId: string
  isOwner: boolean
  publicPanel?: ReactNode
  visitorState?: any // Added for relationship context
}

type DetailSectionProps = {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

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

const SHOPKEEPER_CHARACTER_ID = "__shopkeeper__"

function entranceReactionContent(character: TavernCharacter, tavernName: string) {
  const firstMessage = String(character.first_mes || "").trim()
  if (firstMessage) return firstMessage
  const name = character.name || "这里的 NPC"
  return `你刚走进${tavernName || "这间空间"}，${name}向你点了点头。`
}

function entranceReactionMessages(characters: TavernCharacter[], tavernName: string): ChatMessage[] {
  const timestamp = new Date().toISOString()
  return characters.map((character, index) => ({
    id: `entrance-${character.id || index}-${timestamp}`,
    role: "assistant",
    character_id: character.id,
    content: entranceReactionContent(character, tavernName),
    timestamp,
  }))
}

function hasTavernTasks(tavern: Tavern) {
  return Array.isArray(tavern.gameplay_definitions) && tavern.gameplay_definitions.length > 0
}

function hostGuideMessage(tavern: Tavern, characters: TavernCharacter[]): ChatMessage {
  const timestamp = new Date().toISOString()
  const hasTasks = hasTavernTasks(tavern)
  const otherNpcs = characters.length > 3 
    ? `，目前 ${characters[0].name}、${characters[1].name} 等 ${characters.length} 位 NPC 都在场`
    : characters.length > 0
      ? `，目前 ${characters.map(c => c.name || c.id).join('、')} 都在场`
      : ""

  const mentionHint = characters.length
    ? `也可以在公共频道输入 @NPC名，或者点击左侧头像，我会把话递给对应的人。`
    : "等店主添加 NPC 后，就可以直接找他们聊天。"

  return {
    id: `host-guide-${timestamp}`,
    role: "assistant",
    character_id: SHOPKEEPER_CHARACTER_ID,
    content: hasTasks
      ? `我是店长，欢迎来到${tavern.name || "这间空间"}${otherNpcs}。可以先在公共频道和大家打招呼，${mentionHint} 这间空间现在有任务，想推进剧情或玩法时可以从任务入口开始。`
      : `我是店长，欢迎来到${tavern.name || "这间空间"}${otherNpcs}。可以先在公共频道和大家打招呼，${mentionHint} 想单独聊，就点左侧某个 NPC 进入私聊。`,
    timestamp,
  }
}

function publicEntranceMessages(characters: TavernCharacter[], tavern: Tavern, shopkeeperNpc?: TavernCharacter): ChatMessage[] {
  // If we have a real NPC shopkeeper, they greet.
  // Otherwise, the host guide (virtual shopkeeper) greets.
  // If no virtual shopkeeper and no NPC shopkeeper, pick one NPC to fallback greet.
  const greetings: ChatMessage[] = []

  if (shopkeeperNpc) {
    greetings.push({
      id: `entrance-shopkeeper-${Date.now()}`,
      role: "assistant",
      character_id: shopkeeperNpc.id,
      content: entranceReactionContent(shopkeeperNpc, tavern.name),
      timestamp: new Date().toISOString(),
    })
  }

  greetings.push(hostGuideMessage(tavern, characters))
  return greetings
}

function normalizeMentionName(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase()
}

function parsePublicMentionTarget(message: string, characters: TavernCharacter[]) {
  const match = message.trim().match(/^@([^\s，,：:]+)\s*[:：,，]?\s*(.*)$/)
  if (!match) return null
  const mentionName = normalizeMentionName(match[1] || "")
  if (!mentionName) return null
  const character = characters.find((candidate) => (
    normalizeMentionName(candidate.name || "") === mentionName ||
    normalizeMentionName(candidate.id || "") === mentionName
  ))
  if (!character) return null
  const directMessage = String(match[2] || "").trim() || message.trim().replace(/^@[^\s，,：:]+/, "").trim()
  return {
    character,
    message: directMessage || message.trim(),
  }
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

function isSystemPublicWelfareTavern(tavern: Tavern) {
  const ownerId = String(tavern.owner_id || "").trim()
  const tavernId = String(tavern.id || "").trim()
  return ownerId === "system_public_welfare" || ownerId.startsWith("system_") || tavernId.startsWith("pw_")
}

function responseModeLabel(tavern: Tavern) {
  const llmConfig = (tavern.llm_config || {}) as Record<string, unknown>
  const backend = String(llmConfig.backend || "").trim().toLowerCase()
  if (isSystemPublicWelfareTavern(tavern)) {
    return {
      kind: "system_public_welfare_llm",
      label: "公益 LLM",
      title: "公益空间",
    }
  }
  if (["rules", "rule_based", "public_welfare"].includes(backend)) {
    return {
      kind: "llm_not_configured",
      label: "需配置 LLM",
      title: "规则后端不能生成 NPC 回复；店主需要配置外部模型。",
    }
  }
  if (tavern.status === "closed" && backend !== "rules" && backend !== "rule_based" && backend !== "public_welfare") {
    return {
      kind: "missing",
      label: "暂不开放",
      title: "店主还没开放聊天功能，敬请期待。",
    }
  }
  return {
    kind: "llm",
    label: "AI 对话",
    title: "NPC 已准备好和你对话。",
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
              onClick={() => {
                if (activeChatChannel === "public") {
                  handleSelectNpcInPublic(character.id)
                } else {
                  onSelectCharacter(character.id)
                }
              }}
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
  const characterNameById = useMemo(
    () => new Map(characters.map((character) => [character.id, character.name || character.id || "NPC"])),
    [characters],
  )
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id || "")
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0],
    [characters, selectedCharacterId],
  )
  const [selectedIntentId, setSelectedIntentId] = useState("")
  const [visitorId] = useState(currentUserId)
  const [visitorName, setVisitorName] = useState(isOwner ? "店主" : "旅人")
  const [visitorGender, setVisitorGender] = useState("unspecified")
  const [message, setMessage] = useState("")
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionIndex, setMentionIndex] = useState(0)
  const [targetedCharacterId, setTargetedCharacterId] = useState("") // For smart targeting
  const [visitorState, setVisitorState] = useState<any>(null)
  const mentionRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [activeChatChannel, setActiveChatChannel] = useState<ChatChannel>("public")
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([])
  const [privateMessagesByCharacterId, setPrivateMessagesByCharacterId] = useState<Record<string, ChatMessage[]>>({})
  const [password, setPassword] = useState("")
  const [hasEnteredPasswordTavern, setHasEnteredPasswordTavern] = useState(false)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const [searchParams] = useSearchParams()

  const [gameplayDefinitions, setGameplayDefinitions] = useState<any[]>([])

  const [activeSession, setActiveSession] = useState<any>(null)
  const [gameplayScene, setGameplayScene] = useState<any>({})
  const [isGameplayBusy, setIsGameplayBusy] = useState(false)

  const access = String(tavern.access || "public")

  const passwordLocked = access === "password" && !isOwner && !hasEnteredPasswordTavern
  const visibleMessages = activeChatChannel === "public"
    ? publicMessages
    : privateMessagesByCharacterId[selectedCharacter?.id || ""] || []
  const roleplayMode = roleplay?.roleplay_mode || tavern.roleplay_mode || "ai_only"
  const responseMode = responseModeLabel(tavern)

  const mentionMatches = useMemo(() => {
    if (!mentionQuery) return characters
    const query = mentionQuery.toLowerCase()
    return characters.filter((char) => (char.name || char.id || "").toLowerCase().includes(query))
  }, [characters, mentionQuery])
  const selectedIntent = useMemo(() => findConversationIntent(selectedIntentId), [selectedIntentId])

  useEffect(() => {
    if (characters.length && !characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].id)
    }
  }, [characters, selectedCharacterId])

  useEffect(() => {
    if (access === "password" && isOwner) {
      setHasEnteredPasswordTavern(true)
      return
    }
    if (access === "password") return

    let cancelled = false
    enterTavern(tavern.id, "", visitorId, visitorGender)
      .then((res) => {
        if (cancelled) return
        if (res.visitor_state) {
          setVisitorState(res.visitor_state)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [access, isOwner, tavern.id, visitorId])

  useEffect(() => {
    if (passwordLocked) {
      setPublicMessages([])
      setPrivateMessagesByCharacterId({})
      return
    }

    // Identify shopkeeper NPC
    const shopkeeperNpc = characters.find(c => 
      c.name?.includes("店长") || 
      c.tags?.some(t => t.toLowerCase().includes("shopkeeper") || t.includes("店长"))
    )

    // Identity friendly NPCs who should greet in private
    const friendlyNpcs = characters.filter(c => {
      const stage = visitorState?.relationship?.stage || "stranger"
      return ["familiar", "friend", "close_friend", "best_friend"].includes(stage)
    })

    setActiveChatChannel("public")
    
    // Public greetings: Shopkeeper only
    setPublicMessages(publicEntranceMessages(characters, tavern, shopkeeperNpc))

    // Private greetings: Friendly NPCs only
    const privateGreetings: Record<string, ChatMessage[]> = {}
    friendlyNpcs.forEach(npc => {
      privateGreetings[npc.id] = [{
        id: `entrance-private-${npc.id}-${Date.now()}`,
        role: "assistant",
        character_id: npc.id,
        content: entranceReactionContent(npc, tavern.name),
        timestamp: new Date().toISOString(),
      }]
    })
    setPrivateMessagesByCharacterId(privateGreetings)

  }, [characters, passwordLocked, tavern.id, tavern.name, tavern.gameplay_definitions, visitorState])

  useEffect(() => {
    if (passwordLocked) return

    // Load gameplays and sessions
    let cancelled = false
    const loadGameplayData = async () => {
      try {
        const [defsRes, sessionsRes] = await Promise.all([
          getGameplays(tavern.id, visitorId),
          listGameplaySessions(tavern.id, { state: "active", visitor_id: visitorId }, visitorId),
        ])
        if (cancelled) return
        setGameplayDefinitions(defsRes.gameplay_definitions || [])
        if (sessionsRes.sessions?.length > 0) {
          const session = sessionsRes.sessions[0]
          setActiveSession(session)
          // Initial scene from last event if possible
          const lastEvent = Array.isArray(session.events) ? session.events[session.events.length - 1] : null
          if (lastEvent?.scene) {
            setGameplayScene(lastEvent.scene)
          }
        }
      } catch (err) {
        console.error("Failed to load gameplay data:", err)
      }
    }
    void loadGameplayData()
    return () => {
      cancelled = true
    }
  }, [tavern.id, visitorId, passwordLocked])

  useEffect(() => {

    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, busy])

  useEffect(() => {
    setMentionIndex(0)
  }, [mentionMatches])

  async function handlePasswordEnter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password.trim()) return
    setBusy("enter")
    setError("")
    try {
      await enterTavern(tavern.id, password.trim(), visitorId, visitorGender)
      setHasEnteredPasswordTavern(true)
      setPassword("")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy("")
    }
  }

  function appendPrivateMessages(characterId: string, lines: ChatMessage[]) {
    setPrivateMessagesByCharacterId((current) => ({
      ...current,
      [characterId]: [...(current[characterId] || []), ...lines],
    }))
  }

  function buildUserLine(content: string, characterId?: string): ChatMessage {
    const now = new Date().toISOString()
    return {
      id: `local-user-${now}`,
      role: "user",
      content,
      character_id: characterId,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_gender: visitorGender,
      timestamp: now,
    }
  }

  function buildAssistantLine(
    content: string,
    characterId: string | undefined,
    result?: Parameters<typeof progressSignalsFromChatResult>[0],
  ): ChatMessage {
    const now = new Date().toISOString()
    return {
      id: `local-assistant-${now}`,
      role: "assistant",
      content,
      character_id: characterId,
      visitor_id: visitorId,
      progress_signals: result ? progressSignalsFromChatResult(result) : [],
      timestamp: now,
    }
  }

  function mapGroupResponseMessages(result: Awaited<ReturnType<typeof sendGroupChat>>): ChatMessage[] {
    const progress_signals = progressSignalsFromChatResult(result)
    const lines = (Array.isArray(result.messages) ? result.messages : [])
      .map((groupMessage, index) => ({
        id: groupMessage.id || `local-group-${Date.now()}-${index}`,
        role: groupMessage.role || "assistant",
        content: String(groupMessage.content || "").trim(),
        character_id: groupMessage.character_id,
        visitor_name: groupMessage.visitor_name,
        timestamp: groupMessage.timestamp || new Date().toISOString(),
      }))
      .filter((groupMessage) => groupMessage.content)
    return lines.map((line, index) =>
      index === lines.length - 1 ? { ...line, progress_signals } : line,
    )
  }

  function toggleConversationIntent(intentId: string) {
    const next = String(intentId || "").trim()
    if (!next) return
    setSelectedIntentId((current) => (current === next ? "" : next))
  }

  function clearConversationIntent() {
    setSelectedIntentId("")
  }

  async function sendPrivateChat(cleanMessage: string, intentForTurn = selectedIntent) {
    if (!selectedCharacter) return
    const userLine = buildUserLine(cleanMessage, selectedCharacter.id)
    appendPrivateMessages(selectedCharacter.id, [userLine])

    const result = await sendTavernChat(tavern.id, {
      character_id: selectedCharacter.id,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_gender: visitorGender,
      message: cleanMessage,
      display_message: cleanMessage,
      extra_context: buildConversationIntentContext(intentForTurn),
    })
    const responseText = String(result.response || "").trim()
    if (responseText) {
        appendPrivateMessages(selectedCharacter.id, [buildAssistantLine(responseText, selectedCharacter.id, result)])
    } else if (result.degradation?.message) {
      setError(result.degradation.message)
    }
  }

  async function sendPublicChat(cleanMessage: string, intentForTurn = selectedIntent) {
    const mention = parsePublicMentionTarget(cleanMessage, characters)
    const targetedChar = characters.find(c => c.id === targetedCharacterId)
    const targetCharacter = mention?.character || targetedChar || selectedCharacter
    
    // Clear targeted character after use
    setTargetedCharacterId("")

    setPublicMessages((current) => [...current, buildUserLine(cleanMessage, targetCharacter?.id)])

    if (targetCharacter) {
      const result = await sendTavernChat(tavern.id, {
        character_id: targetCharacter.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        message: mention?.message || cleanMessage,
        display_message: cleanMessage,
        extra_context: buildConversationIntentContext(intentForTurn),
      })
      const responseText = String(result.response || "").trim()
      if (responseText) {
        setPublicMessages((current) => [...current, buildAssistantLine(responseText, targetCharacter.id, result)])
      } else if (result.degradation?.message) {
        setError(result.degradation.message)
      }
      return
    }

    if (characters.length > 1 && Boolean((tavern as { group_chat_enabled?: unknown }).group_chat_enabled)) {
      const result = await sendGroupChat(tavern.id, {
        message: buildMessageWithConversationIntent(cleanMessage, intentForTurn),
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        display_message: cleanMessage,
      })
      const replyLines = mapGroupResponseMessages(result)
      if (replyLines.length) {
        setPublicMessages((current) => [...current, ...replyLines])
      }
      if (result.degraded && result.error) {
        setError(result.error)
      }
      return
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const cleanMessage = message.trim()
    if (!cleanMessage || passwordLocked) return
    if (activeChatChannel === "private" && !selectedCharacter) return

    setMessage("")
    setBusy("send")
    const intentForTurn = selectedIntent
    clearConversationIntent()
    setError("")

    try {
      if (activeChatChannel === "public") {
        await sendPublicChat(cleanMessage, intentForTurn)
      } else {
        await sendPrivateChat(cleanMessage, intentForTurn)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy("")
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionMatches.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setMentionIndex((i) => Math.min(i + 1, mentionMatches.length - 1))
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setMentionIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
        event.preventDefault()
        insertMention(mentionIndex)
        return
      }
      if (event.key === "Escape") {
        setMentionQuery("")
        return
      }
    }
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    void handleSubmit()
  }

  function insertMention(index: number) {
    const char = mentionMatches[index]
    if (!char) return
    const name = char.name || char.id || ""
    // Replace the @query part with @name
    const atIndex = message.lastIndexOf("@")
    if (atIndex === -1) return
    const before = message.slice(0, atIndex)
    const after = message.slice(atIndex + mentionQuery.length + 1)
    setMessage(`${before}@${name} ${after}`)
    setMentionQuery("")
    setMentionIndex(0)
    textareaRef.current?.focus()
  }

  function handleSelectNpcInPublic(characterId: string) {
    const char = characters.find((c) => c.id === characterId)
    if (!char) return

    const name = char.name || char.id || ""
    
    // Toggle targeted state
    if (targetedCharacterId === characterId) {
      setTargetedCharacterId("")
    } else {
      setTargetedCharacterId(characterId)
      
      // Also insert @mention as per PRD requirements
      const mentionText = `@${name} `
      if (!message.includes(mentionText)) {
        setMessage((prev) => {
          const trimmed = prev.trim()
          return trimmed ? `${trimmed} ${mentionText}` : mentionText
        })
      }
      
      // Focus textarea
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId)
    setActiveChatChannel("private")
    setTargetedCharacterId("")
    setError("")
  }

  function selectPublicChannel() {
    setActiveChatChannel("public")
    setTargetedCharacterId("")
    setError("")
  }

  async function handleStartGameplay(definition: any) {
    setIsGameplayBusy(true)
    setError("")
    try {
      const res = await startGameplaySession(tavern.id, {
        definition_id: definition.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
      })
      // The startGameplaySession usually returns a basic session object
      // We might need to fetch the full session or it might be returned
      const sessionsRes = await listGameplaySessions(tavern.id, { state: "active", visitor_id: visitorId }, visitorId)
      const session = sessionsRes.sessions?.find((s: any) => s.id === res.session_id) || res
      setActiveSession(session)
      const lastEvent = Array.isArray(session.events) ? session.events[session.events.length - 1] : null
      setGameplayScene(lastEvent?.scene || {})
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsGameplayBusy(false)
    }
  }

  async function handleAdvanceGameplay(data: { choice_id?: string; message?: string }) {
    if (!activeSession) return
    setIsGameplayBusy(true)
    setError("")
    try {
      const res = await advanceGameplaySession(tavern.id, activeSession.id, data, visitorId)
      if (res.ok) {
        // Fetch refreshed session to get all events
        const sessionsRes = await listGameplaySessions(tavern.id, { state: "active", visitor_id: visitorId }, visitorId)
        const session = sessionsRes.sessions?.find((s: any) => s.id === activeSession.id)
        if (session) {
          setActiveSession(session)
          const lastEvent = Array.isArray(session.events) ? session.events[session.events.length - 1] : null
          setGameplayScene(lastEvent?.scene || {})
          
          if (session.state === 'completed') {
             // Optional: handle completion logic
          }
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsGameplayBusy(false)
    }
  }

  async function handleAbandonGameplay() {
    if (!activeSession) return
    if (!confirm("确定要放弃当前的玩法进度吗？")) return
    setIsGameplayBusy(true)
    setError("")
    try {
      await abandonGameplaySession(tavern.id, activeSession.id, visitorId)
      setActiveSession(null)
      setGameplayScene({})
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsGameplayBusy(false)
    }
  }

  const isOrphanSignalMode = tavern.special_type === "divination" || searchParams.get("ui_style") === "orphan-signal"
  const miniGameTemplates = getMiniGameTemplates()
  const currentGameplay = gameplayDefinitions[0] // Default to first for now if session starts


  return (

    <section data-chat-workbench="sillytavern-style" data-active-chat-channel={activeChatChannel} className="space-y-6">
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
                {textOrFallback(tavern.description, "选择 NPC 后，直接在底部输入框开始聊天。空间资料和其它公开功能已折叠在下方。")}
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
                {responseMode.kind === "system_public_welfare_llm" ? (
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
                <p className="text-xs uppercase tracking-[0.18em] text-violet-100/45">Channels</p>
                <h2 className="text-base font-black text-white">聊天频道</h2>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                {characters.length}
              </span>
            </div>
            <button
              type="button"
              data-public-chat-channel
              aria-pressed={activeChatChannel === "public"}
              onClick={selectPublicChannel}
              className={`mb-3 flex min-h-16 w-full min-w-0 items-center gap-3 rounded-3xl border p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                activeChatChannel === "public" ? "border-cyan-300/55 bg-cyan-300/14" : "border-white/10 bg-slate-950/30"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-50 ring-1 ring-cyan-200/35">
                <UsersRound className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">公共聊天</span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-violet-50/56">
                  默认入口，所有 NPC 打招呼；支持 @NPC名
                </span>
              </span>
            </button>
            <NpcSeatGallery
              characters={characters}
              selectedCharacterId={activeChatChannel === "private" ? selectedCharacter?.id || selectedCharacterId : ""}
              onSelectCharacter={selectCharacter}
            />
            <div className="space-y-2">
              {characters.length ? (
                characters.map((character) => {
                  const active = activeChatChannel === "private" && character.id === selectedCharacter?.id
                  return (
                    <button
                      key={character.id}
                      type="button"
                      data-private-chat-channel
                      onClick={() => {
                        if (activeChatChannel === "public") {
                          handleSelectNpcInPublic(character.id)
                        } else {
                          selectCharacter(character.id)
                        }
                      }}
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
                  这间空间还没有 NPC。店主可以在管理入口导入 SillyTavern 兼容角色卡。
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
                  {activeChatChannel === "public" ? (
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] border border-cyan-100/18 bg-gradient-to-br from-cyan-300/18 via-violet-300/10 to-fuchsia-300/16 text-cyan-50 shadow-2xl shadow-cyan-950/35 ring-1 ring-cyan-200/45 sm:h-28 sm:w-28">
                      <UsersRound className="h-10 w-10" />
                    </span>
                  ) : (
                    <CharacterStagePortrait character={selectedCharacter} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-cyan-100/68">
                      <Bot className="h-3.5 w-3.5" />
                      {activeChatChannel === "public" ? "公共频道" : "当前 NPC 舞台"}
                    </p>
                    <h2 className="mt-1 break-words text-xl font-black text-white sm:text-2xl">
                      {activeChatChannel === "public" ? "公共聊天" : selectedCharacter?.name || "暂无 NPC"}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-violet-100/62">
                      {activeChatChannel === "public" ? (
                        <>
                          <span>公共频道 · 可 @NPC名</span>
                          <span className="text-cyan-100/78">· 店长正在引导你</span>
                        </>
                      ) : (
                        <>
                          <span>{selectedCharacter ? roleplayModeLabel(String(roleplayMode)) : "请先添加角色"}</span>
                          {selectedCharacter ? <span>· {genderLabel(selectedCharacter.gender)}</span> : null}
                          {selectedCharacter ? <span className="text-cyan-100/78">· 正在接待你</span> : null}
                        </>
                      )}
                    </p>
                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-violet-50/72">
                      {activeChatChannel === "public"
                        ? "这里是空间公共聊天窗口。直接发言会进入公共频道；输入 @NPC名 可以把话递给指定 NPC。"
                        : characterStageSummary(selectedCharacter, tavern.name)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-2 md:flex">
                    <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-50">
                      {activeChatChannel === "public" ? "公共频道" : "正在接待你"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-violet-50/62">
                      Shift+Enter 换行
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isOrphanSignalMode ? (
              <div className="p-4">
                <OrphanSignalGameplayPanel
                  session={activeSession}
                  scene={gameplayScene}
                  gameplay={currentGameplay}
                  busy={isGameplayBusy}
                  onChoice={(choice: any) => handleAdvanceGameplay({ choice_id: choice.id })}
                  onSubmit={(text: string) => handleAdvanceGameplay({ message: text })}
                  onAbandon={handleAbandonGameplay}
                  onStart={handleStartGameplay}
                  miniGameTemplates={miniGameTemplates}
                />
              </div>
            ) : activeSession ? (
              <div className="p-4">
                <GameplaySessionPanel
                  session={activeSession}
                  scene={gameplayScene}
                  gameplay={currentGameplay}
                  busy={isGameplayBusy}
                  onChoice={(choice: any) => handleAdvanceGameplay({ choice_id: choice.id })}
                  onSubmit={(text: string) => handleAdvanceGameplay({ message: text })}
                  onAbandon={handleAbandonGameplay}
                />
              </div>
            ) : null}

            {passwordLocked ? (

              <form onSubmit={handlePasswordEnter} className="m-4 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-amber-100" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-amber-50">这间空间需要密码</p>
                    <p className="mt-1 text-sm leading-6 text-amber-50/72">输入店主提供的密码后即可进入空间并开始对话。</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        className="min-h-12 flex-1 rounded-2xl border border-white/12 bg-slate-950/55 px-4 text-white outline-none focus:border-amber-200/70"
                        placeholder="空间密码"
                      />
                      <Button type="submit" disabled={busy === "enter" || !password.trim()}>
                        <DoorOpen className="h-4 w-4" />
                        进入空间
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ) : null}

            <div
              ref={chatLogRef}
              data-entrance-reactions
              data-chat-log-compact
              aria-label="聊天记录"
              className="max-h-[min(52vh,34rem)] space-y-4 overflow-y-auto p-4 sm:p-5"
            >
              {visibleMessages.map((line, index) => {
                const isUser = line.role === "user"
                const targetName = characterNameById.get(line.character_id || "")
                const speakerName = isUser
                  ? activeChatChannel === "public" && targetName
                    ? `${visitorName || visitorId} → @${targetName}`
                    : visitorName || visitorId
                  : line.character_id === SHOPKEEPER_CHARACTER_ID
                    ? "店长"
                    : targetName || "NPC"
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
                        {speakerName}
                        {formatChatTime(line.timestamp) ? <span className="ml-2 font-semibold normal-case tracking-normal">{formatChatTime(line.timestamp)}</span> : null}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{line.content}</p>
                      {isUser
                        ? null
                        : Array.isArray(line.progress_signals) &&
                          line.progress_signals.length > 0 && (
                            <div
                              data-conversation-progress-card
                              className="mt-3 rounded-2xl border border-emerald-200/25 bg-emerald-200/6 px-3 py-2 text-[0.76rem] leading-5 text-emerald-100/85"
                            >
                              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100/90">本轮有推进</p>
                              <div className="space-y-1">
                                {line.progress_signals.map((signal, signalIndex) => (
                                  <p
                                    key={signal.message || `${signal.type}-${signalIndex}`}
                                    className="text-violet-50/84"
                                  >
                                    {signal.message || signal.label || ""}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                    </div>
                  </div>
                )
              })}
              {busy === "send" ? (
                <div className="flex justify-start">
                  <div className="rounded-[1.35rem] rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-violet-50/68">
                    {activeChatChannel === "public" ? "公共频道正在接话…" : `${selectedCharacter?.name || "NPC"} 正在回复…`}
                  </div>
                </div>
              ) : null}
            </div>

            {error && !passwordLocked ? (
              <div className="border-t border-white/10 px-4 py-3">
                <p className="rounded-2xl border border-red-300/25 bg-red-300/10 p-3 text-sm leading-6 text-red-50">{error}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} data-chat-composer="fast-entry" className="border-t border-white/10 bg-slate-950/80 p-3 sm:p-4">
              <section
                aria-label="对话意图"
                data-conversation-intent-chips
                className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5"
              >
                <div className="mb-2 flex items-center justify-between text-xs text-violet-100/68">
                  <span>对话意图</span>
                  <button
                    type="button"
                    onClick={clearConversationIntent}
                    className="text-violet-100/58 transition hover:text-cyan-100"
                  >
                    清除
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONVERSATION_INTENT_CHIPS.map((intent) => {
                    const isSelected = selectedIntentId === intent.id
                    return (
                      <button
                        key={intent.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleConversationIntent(intent.id)}
                        data-selected-conversation-intent={isSelected ? "true" : "false"}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-cyan-300/65 bg-cyan-300/20 text-cyan-50"
                            : "border-white/20 bg-white/[0.03] text-violet-50/72 hover:border-white/35"
                        }`}
                      >
                        {intent.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[0.7rem] text-violet-100/62">
                  {selectedIntent
                    ? `已选择「${selectedIntent.label}」，仍需你自己输入发言内容后点击发送。`
                    : "未选择意图：仍需你输入自己的发言内容后再发送。"}
                </p>
              </section>
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
                <div ref={mentionRef} className="relative min-w-0 flex-1">
                  {targetedCharacterId && activeChatChannel === "public" && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5">
                      <span className="text-xs font-bold text-cyan-100">
                        正在对 <span className="text-white">{characterNameById.get(targetedCharacterId)}</span> 发言
                      </span>
                      <button
                        type="button"
                        onClick={() => setTargetedCharacterId("")}
                        className="text-xs text-cyan-200/60 hover:text-cyan-100"
                      >
                        取消点名
                      </button>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value)
                      // Detect @ mention
                      const value = event.target.value
                      const cursor = event.target.selectionStart ?? value.length
                      const beforeCursor = value.slice(0, cursor)
                      const atMatch = beforeCursor.match(/@([^@]*)$/)
                      if (atMatch) {
                        setMentionQuery(atMatch[1] || "")
                      } else {
                        setMentionQuery("")
                      }
                    }}
                    onKeyDown={handleComposerKeyDown}
                    disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || passwordLocked}
                    rows={2}
                    maxLength={1600}
                    placeholder={activeChatChannel === "public" ? "公共频道：直接发言，或 @NPC名 对指定 NPC 说话" : `Type a message，和 ${selectedCharacter?.name || "NPC"} 私聊；Shift+Enter 换行`}
                    className="min-h-14 w-full resize-none rounded-3xl border border-white/12 bg-white/[0.06] px-5 py-3 text-sm leading-6 text-white outline-none placeholder:text-violet-100/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  {mentionQuery !== undefined && mentionMatches.length > 0 && activeChatChannel === "public" && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/98 shadow-xl shadow-black/40">
                      {mentionMatches.map((char, index) => (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => insertMention(index)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                            index === mentionIndex ? "bg-cyan-300/18 text-cyan-50" : "text-violet-50 hover:bg-white/[0.06]"
                          }`}
                        >
                          {char.name || char.id}
                          <span className="ml-auto text-xs text-violet-100/45">{char.description?.slice(0, 30) || "可对话角色"}</span>
                        </button>
                      ))}
                      <div className="border-t border-white/10 px-4 py-1.5 text-center text-xs text-violet-100/45">
                        Tab/Enter 选中 · 方向键切换 · Esc 关闭
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || passwordLocked || !message.trim()} className="min-h-14 sm:w-28">
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

                <DetailSection title="更多空间功能" description="分享、公开扩展和回访入口折叠收纳">
                  {publicPanel || <SpaceCapabilityHubPanel tavern={tavern} />}
                </DetailSection>
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  )
}

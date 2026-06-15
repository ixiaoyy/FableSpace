import {
  ChevronDown,
  DoorOpen,
  LockKeyhole,
  MapPin,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { useSearchParams } from "react-router"

import { normalizePublicWelfareNpcAssetPath } from "../../lib/tavern-runtime-config.js"
import { buildTavernFirstMinuteGuide, type TavernFirstMinuteAction } from "../../lib/tavern-first-minute"

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
import { progressEchoesFromChatResult } from "./conversation-beats.js"
import {
  getGameplays,
  startGameplaySession,
  advanceGameplaySession,
  abandonGameplaySession,
  listGameplaySessions,
} from "../../lib/taverns"
import { getMiniGameTemplates } from "../../product/tavernMiniGames"
import OrphanEchoGameplayPanel from "../../product/OrphanEchoGameplayPanel"
import GameplaySessionPanel from "../../product/GameplaySessionPanel"
import { SpaceCapabilityHubPanel } from "../../components/SpaceCapabilityHubPanel"


type ChatChannel = "public" | "private"

type GameplayDefinitionRecord = Record<string, any> & {
  id?: string
  title?: string
  entry_label?: string
  summary?: string
  status?: string
}

type RoleplayStarterPrompt = {
  id: string
  label: string
  helper: string
  prompt: string
}

type ReplyCoachTone = "idle" | "guide" | "warning" | "ready"

type ReplyCoachCheck = {
  id: string
  label: string
  done: boolean
}

type ReplyCoachView = {
  tone: ReplyCoachTone
  eyebrow: string
  title: string
  body: string
  example: string
  showExample: boolean
  checks: ReplyCoachCheck[]
}

const ROLEPLAY_STARTER_PROMPTS: RoleplayStarterPrompt[] = [
  {
    id: "outsider",
    label: "失忆 / 外来者",
    helper: "自然询问地点、处境和当前危机",
    prompt: "*我揉了揉发痛的额角，环顾四周* 这里是哪里？刚刚发生了什么？",
  },
  {
    id: "tension",
    label: "突发危机",
    helper: "快速让 NPC 推动下一幕",
    prompt: "*我压低声音，拉住你的衣袖* 等等，周围好像不太对劲，我们接下来怎么办？",
  },
  {
    id: "daily",
    label: "日常闲聊",
    helper: "适合陪伴、治愈、日常空间",
    prompt: "*我在你身边坐下，放松地笑了笑* 你刚刚在想什么？接下来有什么安排？",
  },
  {
    id: "quest",
    label: "明确任务",
    helper: "适合调查、委托、跑团式空间",
    prompt: "*我检查好随身物品，认真看向你* 再确认一下，我们这次要完成什么目标？",
  },
]

/**
 * Compacts scene text for visitor UI without rewriting owner-authored content.
 * Returns a short display string only; it has no persistence side effects.
 */
function compactSceneLine(value: unknown, fallback = "", maxLength = 72) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ") || fallback
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/**
 * Detects whether a visitor draft contains an action or stage-direction cue.
 * @param text Current composer text authored by the visitor.
 * @returns True when the text looks like in-scene action/dialogue; has no side effects.
 */
function hasRoleplayActionCue(text: string) {
  return /[*＊][^*＊]{2,}[*＊]|（[^）]{2,}）|\([^)]{2,}\)|我(?:走|看|伸|拉|拿|递|环顾|坐|站|停|靠|皱|笑|点头|压低|深吸|检查|握|推|敲)|轻轻|慢慢|突然|低声/.test(text)
}

/**
 * Builds a local reply-coach view model for the chat composer.
 * @param draft Current visitor composer text; this is never rewritten automatically.
 * @param targetName NPC or space-facing target used only in the selectable example.
 * @param hasVisitorSentMessage Whether the visitor has already sent a line in this visible chat.
 * @returns Non-blocking guidance and checklist; does not call APIs or persist data.
 */
function buildWorkbenchReplyCoach(draft: string, targetName: string, hasVisitorSentMessage: boolean): ReplyCoachView {
  const text = draft.trim()
  const target = targetName.trim() || "眼前的 NPC"
  const example = `*我环顾四周，压低声音看向${target}* “先告诉我最紧要的一件事，我们从哪里开始？”`
  const hasAction = hasRoleplayActionCue(text)
  const hasScene = /这里|周围|门口|桌|窗|街|雨|夜|房间|站台|走廊|身边|眼前|空气|脚步|声音/.test(text)
  const hasNextStep = /？|\?|怎么办|接下来|先|跟我|帮|看见|听见|找|确认|目标|线索|任务|等等|哪里|什么/.test(text)
  const oocLike = /你会做什么|你能做什么|能干嘛|有什么功能|怎么玩|介绍一下自己|你的设定|角色卡|提示词|prompt|模型|AI|机器人/i.test(text)
  const checks = [
    { id: "action", label: "动作/神态", done: hasAction },
    { id: "scene", label: "承接场景", done: hasScene },
    { id: "hook", label: "可被接话", done: hasNextStep },
  ]

  if (!text) {
    return {
      tone: "idle",
      eyebrow: hasVisitorSentMessage ? "接戏提示" : "第一句公式",
      title: "动作 + 台词 + 一个下一步",
      body: "把想问的话包装进当前场景，NPC 会更容易顺着演下去。",
      example,
      showExample: true,
      checks,
    }
  }

  if (oocLike) {
    return {
      tone: "warning",
      eyebrow: "避免出戏",
      title: "这句像在问工具能力",
      body: "不要直接问 NPC 会做什么；改成你在场景里观察、靠近、求助或确认目标。",
      example,
      showExample: true,
      checks,
    }
  }

  if (hasAction && hasNextStep && text.length >= 18) {
    return {
      tone: "ready",
      eyebrow: "可以发送",
      title: "这句已经像互动小说了",
      body: "有动作或状态，也给了 NPC 能接住的方向。",
      example,
      showExample: false,
      checks,
    }
  }

  return {
    tone: "guide",
    eyebrow: "补一笔就更稳",
    title: hasAction ? "再给 NPC 一个可接的问题" : "先写一个动作或神态",
    body: hasAction
      ? "可以加一句“接下来怎么办？”或“我该先看哪里？”来交出剧情球。"
      : "例如先写 *我环顾四周*、*我递上雨伞*，再把问题说出口。",
    example,
    showExample: true,
    checks,
  }
}

/**
 * Builds opening-scene digest rows from existing tavern/NPC fields.
 * The rows are UI scaffolding only and must not be treated as new canonical lore.
 */
function buildWorkbenchOpeningDigest(
  tavern: Tavern,
  character: TavernCharacter | undefined,
  firstMinuteGuide: ReturnType<typeof buildTavernFirstMinuteGuide>,
  visitorState: any,
) {
  const rows: { label: string; value: string }[] = []
  const location = compactSceneLine(firstMinuteGuide.anchorLine || tavern.address || tavern.name, "", 54)
  const mood = compactSceneLine(firstMinuteGuide.sceneHint || tavern.description || firstMinuteGuide.experienceHelper, "", 64)
  const npc = compactSceneLine(
    [character?.name, character?.description || character?.personality].filter(Boolean).join(" · "),
    "",
    68,
  )
  const nextStep = compactSceneLine(firstMinuteGuide.tryThisFirst?.[0] || firstMinuteGuide.playObjective, "", 76)
  const visitCount = Number.parseInt(String(visitorState?.visit_count || visitorState?.visitCount || ""), 10)

  if (location) rows.push({ label: "地点", value: location })
  if (mood) rows.push({ label: "氛围", value: mood })
  if (npc) rows.push({ label: "眼前 NPC", value: npc })
  if (Number.isFinite(visitCount) && visitCount > 1) {
    rows.push({ label: "回访", value: `这是你第 ${visitCount} 次回来，可以继续上次的关系感。` })
  }
  if (nextStep) rows.push({ label: "下一步", value: nextStep })

  return rows.slice(0, 5)
}

/**
 * Sorts generic in-character starter prompts for the current tavern mode.
 * These are visitor reply templates only; clicking one pre-fills text and does not auto-send.
 */
function getWorkbenchRoleplayStarters(tavern: Tavern, character: TavernCharacter | undefined, firstMinuteGuide: ReturnType<typeof buildTavernFirstMinuteGuide>) {
  const searchText = [
    tavern.layout_style,
    tavern.place_type,
    tavern.special_type,
    tavern.description,
    tavern.scene_prompt,
    character?.scenario,
    character?.tags?.join(" "),
    firstMinuteGuide.experienceType,
    firstMinuteGuide.playObjective,
  ].filter(Boolean).join(" ").toLowerCase()
  const priority = searchText.includes("quest") || searchText.includes("调查") || searchText.includes("委托") || searchText.includes("线索")
    ? ["quest", "outsider", "tension", "daily"]
    : searchText.includes("陪伴") || searchText.includes("日常") || searchText.includes("home")
    ? ["daily", "outsider", "quest", "tension"]
    : ["outsider", "tension", "daily", "quest"]

  return priority
    .map((id) => ROLEPLAY_STARTER_PROMPTS.find((prompt) => prompt.id === id))
    .filter((prompt): prompt is RoleplayStarterPrompt => Boolean(prompt))
}

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

/**
 * Reads visitor-facing gameplay labels from existing published definitions
 * without assuming every seed uses the same optional display fields.
 */
function gameplayDisplayText(definition: GameplayDefinitionRecord, key: "title" | "entry_label" | "summary", fallback: string) {
  return textOrFallback(definition[key], fallback)
}

/**
 * Reconstructs the current scene from a loaded gameplay definition so resumed
 * sessions still show concrete narration and choices when the session list omits events.
 */
function sceneFromGameplayDefinition(definition: GameplayDefinitionRecord | undefined, nodeId: unknown) {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes : []
  const targetNodeId = String(nodeId || "")
  const node = nodes.find((item: any) => String(item?.id || "") === targetNodeId) || nodes[0]
  if (!node) return {}
  const choices = Array.isArray(node.choices)
    ? node.choices
      .filter((choice: any) => choice?.id)
      .map((choice: any) => ({
        id: String(choice.id),
        label: textOrFallback(choice.label, String(choice.id)),
      }))
    : []
  return {
    node_id: String(node.id || targetNodeId),
    narration: textOrFallback(node.narration, "玩法正在进行。"),
    choices,
  }
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

/**
 * Finds the public doorway host candidate from existing owner-authored NPCs.
 * @param characters Published tavern characters already visible to the visitor.
 * @returns The shopkeeper-like NPC when one exists; no side effects.
 */
function findWorkbenchShopkeeperNpc(characters: TavernCharacter[]) {
  return characters.find((character) =>
    character.name?.includes("店长") ||
    character.tags?.some((tag) => tag.toLowerCase().includes("shopkeeper") || tag.includes("店长")),
  )
}

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

function hostGuideMessage(tavern: Tavern, _characters: TavernCharacter[]): ChatMessage {
  const timestamp = new Date().toISOString()

  return {
    id: `host-guide-${timestamp}`,
    role: "assistant",
    character_id: SHOPKEEPER_CHARACTER_ID,
    content: `欢迎来到${tavern.name || "这间空间"}。`,
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

function formatChatTime(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
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

export function TavernChatWorkbench({
  tavern,
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
  const [visitorId] = useState(currentUserId)
  const visitorName = isOwner ? "店主" : "旅人"
  const visitorGender = "unspecified"
  const [message, setMessage] = useState("")
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
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
  const chatInitializationKeyRef = useRef("")
  const [searchParams] = useSearchParams()
  const [pendingReplyTargetName, setPendingReplyTargetName] = useState("")

  const [gameplayDefinitions, setGameplayDefinitions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [gameplayScene, setGameplayScene] = useState<any>({})
  const [isGameplayBusy, setIsGameplayBusy] = useState(false)
  const [activeGameplayDefinitionId, setActiveGameplayDefinitionId] = useState("")

  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const [lastGift, setLastGift] = useState<{ coins: number; items: string } | null>(null)
  const revisitMode = String(searchParams.get("revisit") || "")
  const [hasPassedDoorway, setHasPassedDoorway] = useState(() => Boolean(isOwner || revisitMode === "continue"))

  const access = String(tavern.access || "public")

  const passwordLocked = access === "password" && !isOwner && !hasEnteredPasswordTavern
  const firstMinuteGuide = useMemo(() => buildTavernFirstMinuteGuide(tavern), [tavern])
  const doorwayHost = selectedCharacter || characters[0]
  const doorwayGreeting = doorwayHost
    ? entranceReactionContent(doorwayHost, tavern.name)
    : "店主还没有安排驻场 NPC。你可以先进来，把第一条想了解的线索留给店主。"
  const doorwayStarterLine = doorwayHost
    ? `你好，${doorwayHost.name || "在场 NPC"}。我刚到这里，想从门口开始了解。`
    : "我刚进门，想先听听这里最值得注意的线索。"
  const shouldShowDoorway = !isOwner && !passwordLocked && !hasPassedDoorway
  const doorwayGameplayDefinitions = useMemo(
    () => {
      const publishedDefinitions = gameplayDefinitions
        .filter((definition) => String(definition?.status || "published").toLowerCase() === "published")
      if (String(tavern.id || "") === "pw_midnight_commission_board") {
        return publishedDefinitions
          .filter((definition) => String(definition?.id || "") === "gp_pw_commission_clue_case")
          .slice(0, 1)
      }
      if (String(tavern.id || "") === "pw_community_repair") {
        return publishedDefinitions
          .filter((definition) => String(definition?.id || "") === "gp_pw_secret_flowerbed_seed_cycle")
          .slice(0, 1)
      }
      return publishedDefinitions.slice(0, 3)
    },
    [gameplayDefinitions, tavern.id],
  )
  const doorwayEntryActions = firstMinuteGuide.quickActions.slice(0, 3)
  const visibleMessages = activeChatChannel === "public"
    ? publicMessages
    : privateMessagesByCharacterId[selectedCharacter?.id || ""] || []
  const hasVisitorSentMessage = visibleMessages.some((line) => line.role === "user")
  const openingDigestRows = useMemo(
    () => buildWorkbenchOpeningDigest(tavern, selectedCharacter, firstMinuteGuide, visitorState),
    [tavern, selectedCharacter, firstMinuteGuide, visitorState],
  )
  const roleplayStarterPrompts = useMemo(
    () => getWorkbenchRoleplayStarters(tavern, selectedCharacter, firstMinuteGuide),
    [tavern, selectedCharacter, firstMinuteGuide],
  )
  const replyCoachTargetName = activeChatChannel === "private"
    ? selectedCharacter?.name || selectedCharacter?.id || "NPC"
    : selectedCharacter?.name || doorwayHost?.name || doorwayHost?.id || "NPC"
  const replyCoach = useMemo(
    () => buildWorkbenchReplyCoach(message, replyCoachTargetName, hasVisitorSentMessage),
    [message, replyCoachTargetName, hasVisitorSentMessage],
  )
  const replyCoachToneClass = replyCoach.tone === "warning"
    ? "border-rose-200/22 bg-rose-300/[0.08]"
    : replyCoach.tone === "ready"
      ? "border-emerald-200/20 bg-emerald-300/[0.07]"
      : "border-amber-200/18 bg-amber-300/[0.065]"
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return []
    if (!mentionQuery) return characters
    const query = mentionQuery.toLowerCase()
    return characters.filter((char) => (char.name || char.id || "").toLowerCase().includes(query))
  }, [characters, mentionQuery])
  useEffect(() => {
    if (characters.length && !characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].id)
    }
  }, [characters, selectedCharacterId])

  useEffect(() => {
    if (isOwner) setHasPassedDoorway(true)
  }, [isOwner])

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

    const shopkeeperNpc = findWorkbenchShopkeeperNpc(characters)

    const initKey = `${tavern.id}:${passwordLocked ? "locked" : "open"}`
    const shouldReplaceInitialMessages = chatInitializationKeyRef.current !== initKey
    chatInitializationKeyRef.current = initKey

    // Identity friendly NPCs who should greet in private
    const friendlyNpcs = characters.filter(c => {
      const stage = visitorState?.relationship?.stage || "stranger"
      return ["familiar", "friend", "close_friend", "best_friend"].includes(stage)
    })

    if (shouldReplaceInitialMessages) {
      setActiveChatChannel("public")
    }
    
    // Public greetings: Shopkeeper only. Do not overwrite an in-flight/first user message
    // when visitorState arrives after the visitor has already sent something.
    const publicGreetings = publicEntranceMessages(characters, tavern, shopkeeperNpc)
    setPublicMessages((current) =>
      shouldReplaceInitialMessages || current.length === 0 ? publicGreetings : current,
    )

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
    setPrivateMessagesByCharacterId((current) =>
      shouldReplaceInitialMessages
        ? privateGreetings
        : {
            ...privateGreetings,
            ...current,
          },
    )

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
        const definitions = defsRes.gameplays || defsRes.gameplay_definitions || []
        setGameplayDefinitions(definitions)
        if (sessionsRes.sessions?.length > 0) {
          const session = sessionsRes.sessions[0]
          setActiveSession(session)
          const sessionRecord = session as Record<string, any>
          const sessionGameplayId = String(sessionRecord.gameplay_id || sessionRecord.definition_id || "")
          const definition = definitions.find((item: any) => String(item?.id || "") === sessionGameplayId)
          const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
          setActiveGameplayDefinitionId(sessionGameplayId)
          setGameplayScene(lastEvent?.scene || sceneFromGameplayDefinition(definition, sessionRecord.current_node_id))
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
    result?: Parameters<typeof progressEchoesFromChatResult>[0],
  ): ChatMessage {
    const now = new Date().toISOString()
    return {
      id: `local-assistant-${now}`,
      role: "assistant",
      content,
      character_id: characterId,
      visitor_id: visitorId,
      progress_echoes: result ? progressEchoesFromChatResult(result) : [],
      fallback_notice: result?.is_fallback === true
        ? String(result.fallback_notice || "NPC 暂时无法给出有效回复，可以换个问法或稍后重试。")
        : "",
      timestamp: now,
    }
  }

  function ensurePrivateEntranceMessage(character: TavernCharacter) {
    if (!character.id) return
    const timestamp = new Date().toISOString()
    setPrivateMessagesByCharacterId((current) => {
      if ((current[character.id] || []).length > 0) return current
      return {
        ...current,
        [character.id]: [{
          id: `entrance-private-${character.id}-${timestamp}`,
          role: "assistant",
          character_id: character.id,
          content: entranceReactionContent(character, tavern.name),
          timestamp,
        }],
      }
    })
  }

  function mapGroupResponseMessages(result: Awaited<ReturnType<typeof sendGroupChat>>): ChatMessage[] {
    const progress_echoes = progressEchoesFromChatResult(result)
    const lines = (Array.isArray(result.messages) ? result.messages : [])
      .map((groupMessage, index) => ({
        id: groupMessage.id || `local-group-${Date.now()}-${index}`,
        role: groupMessage.role || "assistant",
        content: String(groupMessage.content || "").trim(),
        character_id: groupMessage.character_id,
        visitor_name: groupMessage.visitor_name,
        fallback_notice: groupMessage.is_fallback === true
          ? String(groupMessage.fallback_notice || result.fallback_notice || "NPC 暂时无法给出有效回复，可以换个问法或稍后重试。")
          : "",
        timestamp: groupMessage.timestamp || new Date().toISOString(),
      }))
      .filter((groupMessage) => groupMessage.content)
    return lines.map((line, index) =>
      index === lines.length - 1 ? { ...line, progress_echoes } : line,
    )
  }

  async function sendPrivateChat(cleanMessage: string) {
    if (!selectedCharacter) return
    const userLine = buildUserLine(cleanMessage, selectedCharacter.id)
    setPendingReplyTargetName(selectedCharacter.name || selectedCharacter.id || "NPC")
    appendPrivateMessages(selectedCharacter.id, [userLine])

    const result = await sendTavernChat(tavern.id, {
      character_id: selectedCharacter.id,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_gender: visitorGender,
      message: cleanMessage,
      display_message: cleanMessage,
    })
    const responseText = String(result.response || "").trim()
    if (responseText) {
        appendPrivateMessages(selectedCharacter.id, [buildAssistantLine(responseText, selectedCharacter.id, result)])
    } else if (result.degradation?.message) {
      setError(result.degradation.message)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _gift = (result as any).gift
    if (_gift && _gift.coins_added > 0) {
      setCoinBalance(_gift.wallet_balance ?? null)
      const _items = (_gift.events as Array<{ item_name: string; quantity: number }>)
        .map((e) => `${e.item_name}×${e.quantity}`).join(' ')
      setLastGift({ coins: _gift.coins_added, items: _items })
      setTimeout(() => setLastGift(null), 3500)
    }
  }

  async function sendPublicChat(cleanMessage: string) {
    const mention = parsePublicMentionTarget(cleanMessage, characters)
    const targetCharacter = mention?.character
    setPendingReplyTargetName(targetCharacter ? characterNameById.get(targetCharacter.id) || targetCharacter.name || "NPC" : "")

    setPublicMessages((current) => [...current, buildUserLine(cleanMessage, targetCharacter?.id)])

    if (targetCharacter) {
      const result = await sendTavernChat(tavern.id, {
        character_id: targetCharacter.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        message: mention?.message || cleanMessage,
        display_message: cleanMessage,
      })
      const responseText = String(result.response || "").trim()
      if (responseText) {
        setPublicMessages((current) => [...current, buildAssistantLine(responseText, targetCharacter.id, result)])
      } else if (result.degradation?.message) {
        setError(result.degradation.message)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _gift = (result as any).gift
      if (_gift && _gift.coins_added > 0) {
        setCoinBalance(_gift.wallet_balance ?? null)
        const _items = (_gift.events as Array<{ item_name: string; quantity: number }>)
          .map((e) => `${e.item_name}×${e.quantity}`).join(' ')
        setLastGift({ coins: _gift.coins_added, items: _items })
        setTimeout(() => setLastGift(null), 3500)
      }
      return
    }

    if (characters.length > 1 && Boolean((tavern as { group_chat_enabled?: unknown }).group_chat_enabled)) {
      const result = await sendGroupChat(tavern.id, {
        message: cleanMessage,
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
    setMentionQuery(null)
    setMentionIndex(0)
    setBusy("send")
    setError("")

    try {
      if (activeChatChannel === "public") {
        await sendPublicChat(cleanMessage)
      } else {
        await sendPrivateChat(cleanMessage)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPendingReplyTargetName("")
      setBusy("")
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (activeChatChannel === "public" && mentionQuery !== null && mentionMatches.length) {
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
        setMentionQuery(null)
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
    const after = message.slice(atIndex + (mentionQuery?.length || 0) + 1)
    setMessage(`${before}@${name} ${after}`)
    setMentionQuery(null)
    setMentionIndex(0)
    textareaRef.current?.focus()
  }

  function selectCharacter(characterId: string) {
    const character = characters.find((candidate) => candidate.id === characterId)
    if (character) {
      ensurePrivateEntranceMessage(character)
    }
    setSelectedCharacterId(characterId)
    setActiveChatChannel("private")
    setMessage("")
    setMentionQuery(null)
    setMentionIndex(0)
    setError("")
  }

  function selectPublicChannel() {
    setActiveChatChannel("public")
    setMentionQuery(null)
    setMentionIndex(0)
    setError("")
  }

  function handleDoorwayStartChat() {
    prepareDoorwayPrompt(doorwayStarterLine)
  }

  /**
   * Opens the visitor workbench and pre-fills one selected first-minute action.
   * It intentionally does not submit chat, so the visitor keeps agency.
   */
  function prepareDoorwayPrompt(prompt: string) {
    if (doorwayHost?.id) {
      ensurePrivateEntranceMessage(doorwayHost)
      setSelectedCharacterId(doorwayHost.id)
      setActiveChatChannel("private")
    } else {
      setActiveChatChannel("public")
    }
    setMessage(prompt)
    setMentionQuery(null)
    setMentionIndex(0)
    setError("")
    setHasPassedDoorway(true)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    })
  }

  /**
   * Turns a doorway quick action into a prepared chat prompt without making an
   * API call; the user still has to press Send to commit the interaction.
   */
  function handleDoorwayQuickAction(action: TavernFirstMinuteAction) {
    prepareDoorwayPrompt(action.prompt)
  }

  /**
   * Starts one published doorway gameplay as an explicit visitor action. This
   * uses the existing gameplay session API and never sends a chat message.
   */
  async function handleDoorwayStartGameplay(definition: GameplayDefinitionRecord) {
    setHasPassedDoorway(true)
    setMessage("")
    setMentionQuery(null)
    setMentionIndex(0)
    await handleStartGameplay(definition)
  }

  async function handleStartGameplay(definition: any) {
    setIsGameplayBusy(true)
    setError("")
    setActiveGameplayDefinitionId(String(definition?.id || ""))
    try {
      const res = await startGameplaySession(tavern.id, {
        gameplay_id: definition.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
      })
      const responseSession = res.session as Record<string, any> | undefined
      const session = responseSession || { ...res, id: res.session_id, gameplay_id: definition.id }
      setActiveSession(session)
      const sessionRecord = session as Record<string, any>
      const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
      setGameplayScene(res.scene || lastEvent?.scene || sceneFromGameplayDefinition(definition, sessionRecord.current_node_id))
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
        const session = (res.session as Record<string, any> | undefined) || activeSession
        setActiveSession(session)
        const sessionRecord = session as Record<string, any>
        const gameplayId = String(sessionRecord.gameplay_id || sessionRecord.definition_id || activeGameplayDefinitionId || "")
        const definition = gameplayDefinitions.find((item) => String(item?.id || "") === gameplayId)
        const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
        setGameplayScene(res.scene || lastEvent?.scene || sceneFromGameplayDefinition(definition, sessionRecord.current_node_id))
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

  /**
   * Returns a completed visitor gameplay to the doorway task board without
   * deleting the completed session, so the visitor can remember the receipt and start another visit.
   */
  function handleReturnToDoorway() {
    setActiveSession(null)
    setGameplayScene({})
    setActiveGameplayDefinitionId("")
    setError("")
    setHasPassedDoorway(false)
  }

  /**
   * Starts a fresh local story branch from the tavern entrance.
   * This clears only transient UI chat state and never deletes visitor memory,
   * relationship records, persisted messages, or gameplay sessions.
   */
  function handleStartFreshEntranceBranch() {
    const shopkeeperNpc = findWorkbenchShopkeeperNpc(characters)
    setPublicMessages(publicEntranceMessages(characters, tavern, shopkeeperNpc))
    setPrivateMessagesByCharacterId({})
    setActiveChatChannel("public")
    setSelectedCharacterId(characters[0]?.id || "")
    setMessage("")
    setMentionQuery(null)
    setMentionIndex(0)
    setPendingReplyTargetName("")
    setActiveSession(null)
    setGameplayScene({})
    setActiveGameplayDefinitionId("")
    setError("")
    setHasPassedDoorway(false)
    window.requestAnimationFrame(() => {
      chatLogRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  const isOrphanEchoMode = (tavern as Record<string, unknown>).special_type === "divination" || searchParams.get("ui_style") === "orphan-echo"
  const miniGameTemplates = getMiniGameTemplates()
  const currentGameplay = useMemo(() => {
    const sessionDefinitionId = String(activeSession?.gameplay_id || activeSession?.definition_id || activeGameplayDefinitionId || "")
    return gameplayDefinitions.find((definition) => String(definition?.id || "") === sessionDefinitionId) || gameplayDefinitions[0]
  }, [activeGameplayDefinitionId, activeSession, gameplayDefinitions])


  return (

    <section data-chat-workbench="sillytavern-style" data-active-chat-channel={activeChatChannel} className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/72 shadow-2xl shadow-cyan-950/20">
        {/* 移除了冗余的 tavern.name header bar - 标题已在 Hero Panel 展示 */}

        {shouldShowDoorway ? (
          <section
            data-tavern-doorway-ritual
            data-first-minute-play-entry
            className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
          >
            {/* 左侧：场景 + 动作入口 */}
            <div className="rounded-[1.75rem] border border-cyan-200/18 bg-cyan-300/[0.075] p-5 shadow-[0_18px_48px_rgba(8,145,178,0.08)] max-lg:mb-20">
              {/* 场景提示作为主标题 */}
              <h2 className="text-3xl font-black leading-tight text-white">{firstMinuteGuide.sceneHint}</h2>
              {/* 锚点信息 */}
              <p data-doorway-map-anchor className="mt-3 flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm font-bold leading-6 text-cyan-50/76">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{firstMinuteGuide.anchorLine}</span>
              </p>
              {/* 动作入口按钮 */}
              <div className="mt-5 grid gap-2" data-first-minute-action-deck>
                {doorwayEntryActions.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    data-first-minute-action={action.id}
                    onClick={() => handleDoorwayQuickAction(action)}
                    className="flex items-center gap-3 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.075] px-4 py-3 text-left transition hover:border-cyan-200/38 hover:bg-cyan-300/[0.12] focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-200/12 text-xs font-black text-cyan-50">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-cyan-50">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 右侧：NPC 接待 + 任务 */}
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-violet-200/16 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-100">
                <Sparkles className="h-3.5 w-3.5" />
                {firstMinuteGuide.hostRole}
              </div>
              <div className="flex items-start gap-3">
                <CharacterAvatar character={doorwayHost} active />
                <div className="min-w-0">
                  <p className="font-black text-white">{doorwayHost?.name || "驻场 NPC"}</p>
                  <p className="mt-1 text-xs font-bold text-cyan-100/54">{characters.length} 位 NPC 在场 · {firstMinuteGuide.hostRole}</p>
                  <p data-doorway-host-greeting className="mt-2 rounded-3xl rounded-tl-sm border border-white/10 bg-slate-950/45 p-4 text-sm leading-7 text-violet-50/78">
                    {doorwayGreeting}
                  </p>
                </div>
              </div>
              {doorwayGameplayDefinitions.length ? (
                <div className="mt-5 space-y-2" data-doorway-gameplay-list>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/58">可接任务</p>
                  {doorwayGameplayDefinitions.map((definition, index) => (
                    <button
                      key={String(definition.id || index)}
                      type="button"
                      data-doorway-gameplay-entry={String(definition.id || index)}
                      disabled={isGameplayBusy}
                      onClick={() => void handleDoorwayStartGameplay(definition)}
                      className="min-h-16 w-full rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.085] px-4 py-3 text-left transition hover:border-cyan-200/38 hover:bg-cyan-300/[0.13] focus:outline-none focus:ring-4 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="block text-sm font-black text-cyan-50">
                        {gameplayDisplayText(definition, "entry_label", gameplayDisplayText(definition, "title", "开始这个玩法"))}
                      </span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-violet-100/58">
                        {gameplayDisplayText(definition, "summary", "进入一个由 NPC 主持的可完成小任务。")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="opening-scene-reader__starters mt-5 grid gap-2 sm:grid-cols-2" data-roleplay-starter-prompts>
                <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100/68">
                  选一句开口
                </p>
                {roleplayStarterPrompts.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    data-roleplay-starter={starter.id}
                    onClick={() => prepareDoorwayPrompt(starter.prompt)}
                    className="min-h-16 rounded-2xl border border-amber-200/18 bg-amber-300/[0.075] px-4 py-3 text-left transition hover:border-amber-200/42 hover:bg-amber-300/[0.13] focus:outline-none focus:ring-4 focus:ring-amber-300/20"
                  >
                    <strong className="block text-sm font-black text-amber-50">{starter.label}</strong>
                    <span className="mt-1 block text-xs font-bold leading-5 text-violet-100/58">{starter.helper}</span>
                  </button>
                ))}
              </div>
              <Button type="button" data-doorway-start-chat className="mt-5 min-h-12 w-full" onClick={handleDoorwayStartChat}>
                {doorwayGameplayDefinitions.length ? "和 NPC 打招呼 →" : `${firstMinuteGuide.startLabel} →`}
              </Button>
              <p className="mt-3 text-xs leading-5 text-violet-100/52">
                按钮只填草稿或启动任务，不会替你发送。
              </p>
            </div>
          </section>
        ) : null}

        {!shouldShowDoorway ? (
          <>

        {/* ── 金币余额 & 收礼提示（作用域在 TavernChatWorkbench 内）── */}
        {coinBalance !== null && (
          <div className="px-4 pb-2 sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
              🪙 金币：{coinBalance}
            </span>
          </div>
        )}
        {lastGift && (
          <div
            className="mx-4 mb-2 animate-bounce rounded-2xl border border-yellow-300/40 bg-yellow-400/15 px-4 py-2 text-sm font-bold text-yellow-200 shadow-lg sm:mx-6"
            role="status"
            aria-live="polite"
          >
            🎁 收到 {lastGift.items}，+{lastGift.coins} 金币！
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="border-b border-white/10 bg-white/[0.035] p-4 lg:border-b-0 lg:border-r" aria-label="NPC 角色列表">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-white">在场</h2>
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
              </span>
            </button>
            <div className="space-y-2">
              {characters.length ? (
                characters.map((character) => {
                  const active = activeChatChannel === "private" && character.id === selectedCharacter?.id
                  return (
                    <button
                      key={character.id}
                      type="button"
                      data-private-chat-channel
                      onClick={() => selectCharacter(character.id)}
                      className={`flex min-h-16 w-full min-w-0 items-center gap-3 rounded-3xl border p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                        active ? "border-cyan-300/45 bg-cyan-300/12" : "border-white/10 bg-slate-950/30"
                      }`}
                    >
                      <CharacterAvatar character={character} active={active} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">{character.name || character.id}</span>
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
            <div className="border-b border-white/10 px-3 py-2 sm:px-4">
              <div
                data-current-npc-stage-card
                aria-label={activeChatChannel === "public" ? "公共聊天" : "当前 NPC"}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                {activeChatChannel === "public" ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/16 bg-cyan-300/12 text-cyan-50">
                    <UsersRound className="h-5 w-5" />
                  </span>
                ) : (
                  <CharacterAvatar character={selectedCharacter} active />
                )}
                <h2 className="min-w-0 truncate text-base font-black text-white sm:text-lg">
                  {activeChatChannel === "public" ? "公共聊天" : selectedCharacter?.name || "暂无 NPC"}
                </h2>
              </div>
            </div>

            {isOrphanEchoMode ? (
              <div className="p-4">
                <OrphanEchoGameplayPanel
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
                  onReturnToDoorway={handleReturnToDoorway}
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
              {!hasVisitorSentMessage && !passwordLocked ? (
                <section
                  data-opening-scene-reader="chat"
                  className="opening-scene-reader rounded-[1.65rem] border border-amber-200/20 bg-amber-200/[0.06] p-4 shadow-xl shadow-black/15"
                >
                  <div className="opening-scene-reader__header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/68">开场阅读器</p>
                      <h3 className="mt-1 text-xl font-black text-white">先读懂这一幕，再接续故事</h3>
                      <p className="mt-2 text-sm leading-6 text-violet-50/68">
                        酒馆聊天更像互动小说：先顺着场景写动作和台词，不要直接问 NPC“你会做什么”。
                      </p>
                    </div>
                    <span className="opening-scene-reader__mode w-fit rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-50">
                      {firstMinuteGuide.experienceType}
                    </span>
                  </div>

                  <p
                    data-starter-draft-note
                    className="opening-scene-reader__draft-note rounded-2xl border border-amber-200/16 bg-amber-300/[0.07] px-3 py-2 text-xs font-bold leading-5 text-amber-50/78"
                  >
                    点击下面模板只会填入输入框，不会自动发送；你可以改完再按“发送”。
                  </p>

                  <div className="opening-scene-reader__starters grid gap-2 sm:grid-cols-2" data-roleplay-starter-prompts>
                    {roleplayStarterPrompts.map((starter) => (
                      <button
                        key={starter.id}
                        type="button"
                        data-roleplay-starter={starter.id}
                        onClick={() => prepareDoorwayPrompt(starter.prompt)}
                        className="rounded-2xl border border-amber-200/18 bg-amber-300/[0.075] px-4 py-3 text-left transition hover:border-amber-200/42 hover:bg-amber-300/[0.13] focus:outline-none focus:ring-4 focus:ring-amber-300/20"
                      >
                        <strong className="block text-sm font-black text-amber-50">{starter.label}</strong>
                        <span className="mt-1 block text-xs font-bold leading-5 text-violet-100/58">{starter.helper}</span>
                      </button>
                    ))}
                  </div>

                  <div className="opening-scene-reader__digest grid gap-2 sm:grid-cols-2">
                    {openingDigestRows.map((row) => (
                      <article key={row.label} className="rounded-2xl border border-white/10 bg-slate-950/28 p-3">
                        <span className="block text-xs font-black text-amber-100/70">{row.label}</span>
                        <p className="mt-1 text-sm leading-6 text-violet-50/78">{row.value}</p>
                      </article>
                    ))}
                  </div>

                  <div className="opening-scene-reader__reply-rule rounded-2xl border border-rose-200/16 bg-rose-300/10 p-3 text-sm leading-6">
                    <strong className="text-rose-100">避免出戏：</strong>
                    <span className="text-violet-50/72">
                      把问题包进剧情里，例如 <code className="rounded bg-black/25 px-1 py-0.5 text-amber-100">*我环顾四周*</code> “这里发生了什么？”
                    </span>
                  </div>

                  {doorwayGreeting ? (
                    <div className="opening-scene-reader__opener-note">
                      <p className="rounded-2xl border border-white/10 bg-slate-950/28 p-3 text-sm leading-6 text-violet-50/78">
                        {compactSceneLine(doorwayGreeting, "", 220)}
                      </p>
                    </div>
                  ) : null}
                </section>
              ) : null}
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
                      {!isUser && line.fallback_notice ? (
                        <div className="mt-3 rounded-2xl border border-amber-200/25 bg-amber-200/8 px-3 py-2 text-[0.76rem] leading-5 text-amber-100/88">
                          {line.fallback_notice}
                        </div>
                      ) : null}
                      {isUser
                        ? null
                        : Array.isArray(line.progress_echoes) &&
                          line.progress_echoes.length > 0 && (
                            <div
                              data-conversation-progress-echo-card
                              className="mt-3 rounded-2xl border border-emerald-200/25 bg-emerald-200/6 px-3 py-2 text-[0.76rem] leading-5 text-emerald-100/85"
                            >
                              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100/90">本轮有推进</p>
                              <div className="space-y-1">
                                {line.progress_echoes.map((echo, echoIndex) => (
                                  <p
                                    key={echo.message || `${echo.type}-${echoIndex}`}
                                    className="text-violet-50/84"
                                  >
                                    {echo.message || echo.label || ""}
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
                    {pendingReplyTargetName
                      ? `${pendingReplyTargetName} 正在回复…`
                      : activeChatChannel === "public"
                        ? "店里正在回应…"
                        : `${selectedCharacter?.name || "NPC"} 正在回复…`}
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
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <div ref={mentionRef} className="relative min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(event) => {
                      const val = event.target.value
                      setMessage(val)
                      // Detect @ mention
                      if (activeChatChannel !== "public") {
                        setMentionQuery(null)
                        setMentionIndex(0)
                        return
                      }
                      const value = event.target.value
                      const cursor = event.target.selectionStart ?? value.length
                      const beforeCursor = value.slice(0, cursor)
                      const atMatch = beforeCursor.match(/@([^\s@]*)$/)
                      if (atMatch) {
                        setMentionQuery(atMatch[1] || "")
                      } else {
                        setMentionQuery(null)
                      }
                    }}
                    onKeyDown={handleComposerKeyDown}
                    disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || passwordLocked}
                    rows={2}
                    maxLength={1600}
                    placeholder={activeChatChannel === "public" ? "在这里说点什么…" : `对 ${selectedCharacter?.name || "NPC"} 说点什么…`}
                    className="min-h-14 w-full resize-none rounded-3xl border border-white/12 bg-white/[0.06] px-5 py-3 text-sm leading-6 text-white outline-none placeholder:text-violet-100/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  <div
                    data-roleplay-reply-coach
                    className={`mt-2 rounded-2xl border px-3 py-2.5 text-xs leading-5 shadow-sm shadow-black/10 ${replyCoachToneClass}`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="font-black uppercase tracking-[0.16em] text-amber-100/66">{replyCoach.eyebrow}</span>
                      <strong className="text-sm font-black text-white">{replyCoach.title}</strong>
                    </div>
                    <p className="mt-1 text-violet-50/70">{replyCoach.body}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {replyCoach.checks.map((check) => (
                        <span
                          key={check.id}
                          className={`rounded-full border px-2 py-0.5 font-black ${
                            check.done
                              ? "border-emerald-200/25 bg-emerald-300/[0.09] text-emerald-50"
                              : "border-white/10 bg-white/[0.045] text-violet-100/58"
                          }`}
                        >
                          {check.done ? "✓" : "·"} {check.label}
                        </span>
                      ))}
                    </div>
                    {replyCoach.showExample ? (
                      <button
                        type="button"
                        data-roleplay-reply-coach-example
                        onClick={() => {
                          setMessage(replyCoach.example)
                          setMentionQuery(null)
                          setMentionIndex(0)
                          setTimeout(() => textareaRef.current?.focus(), 0)
                        }}
                        disabled={busy === "send" || passwordLocked}
                        className="mt-2 w-full rounded-2xl border border-amber-200/18 bg-slate-950/28 px-3 py-2 text-left font-bold text-amber-50/86 transition hover:border-amber-200/38 hover:bg-amber-300/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        借用句式（只填入，不发送）：{replyCoach.example}
                      </button>
                    ) : null}
                  </div>
                  {mentionQuery !== null && mentionMatches.length > 0 && activeChatChannel === "public" && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/98 shadow-xl shadow-black/40">
                      <div className="px-4 py-2 text-xs text-violet-100/40 border-b border-white/10">
                        输入 @NPC名 后等对应 NPC 回复
                      </div>
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || passwordLocked || !message.trim()} className="min-h-14 sm:w-28">
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </form>

            {!isOwner && !passwordLocked ? (
              <section
                data-story-branch-controls
                className="border-t border-white/10 bg-slate-950/70 px-4 py-3 sm:px-5"
                aria-label="故事支线控制"
              >
                <div className="flex flex-col gap-3 rounded-3xl border border-cyan-200/14 bg-cyan-300/[0.055] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/58">当前支线</p>
                    <p className="mt-1 text-sm font-black text-white">
                      {hasVisitorSentMessage ? "继续这条记忆支线" : "还在开场，可以放心试写第一句"}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-violet-50/62">
                      开新支线只清空本屏草稿和气泡；回访记忆、关系、保存进度保留。
                    </p>
                  </div>
                  <button
                    type="button"
                    data-start-fresh-branch
                    onClick={handleStartFreshEntranceBranch}
                    disabled={busy === "send" || isGameplayBusy}
                    className="min-h-11 shrink-0 rounded-2xl border border-cyan-200/25 bg-slate-950/34 px-4 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-200/48 hover:bg-cyan-300/[0.10] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    从门口开新支线
                  </button>
                </div>
              </section>
            ) : null}

            <section data-chat-sidecar="conversation-context" data-secondary-tools="visitor-folded" className="border-t border-white/10 bg-white/[0.025] p-4">
              <div className="grid gap-3 xl:grid-cols-2">
                <DetailSection title={publicPanel ? "邀请与反馈" : "更多空间功能"}>
                  {publicPanel || <SpaceCapabilityHubPanel tavern={tavern} />}
                </DetailSection>
              </div>
            </section>
          </main>
        </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

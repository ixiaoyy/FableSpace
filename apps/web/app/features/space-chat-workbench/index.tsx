import {
  ArrowRight,
  ChevronDown,
  DoorOpen,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { useSearchParams } from "react-router"

import { mediaAssetUrl } from "../../lib/media-assets"
import { buildSpaceFirstMinuteGuide, type SpaceFirstMinuteAction } from "../../lib/space-first-minute"
import { matchesPublicReference } from "../../lib/web-routes"
import { readVisitorPlayIdentity } from "../../lib/visitor-play-identity"
import {
  HISTORY_PILOT_GAMEPLAY_ID,
  isHistoryPilotExperience,
  isHistoryPilotGameplay,
} from "../../lib/history-pilot-space"

import {
  enterSpace,
  errorMessage,
  sendGroupChat,
  sendSpaceChat,
  type ChatMessage,
  type Space,
  type SpaceCharacter,
} from "../../lib/spaces"
import { Button } from "../../ui/button"
import { progressEchoesFromChatResult } from "./conversation-beats.js"
import {
  getGameplays,
  startGameplaySession,
  advanceGameplaySession,
  abandonGameplaySession,
  listGameplaySessions,
} from "../../lib/spaces"
import StoryProgressPanel from "./story-progress-panel"
import { HistoricalBroadStreetStory } from "./historical-broad-street-story"


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
    helper: "快速让角色推动下一幕",
    prompt: "*我压低声音，拉住你的衣袖* 等等，周围好像不太对劲，我们接下来怎么办？",
  },
  {
    id: "daily",
    label: "日常闲聊",
    helper: "适合陪伴、治愈和日常故事",
    prompt: "*我在你身边坐下，放松地笑了笑* 你刚刚在想什么？接下来有什么安排？",
  },
  {
    id: "quest",
    label: "明确任务",
    helper: "适合调查、委托和剧情探索",
    prompt: "*我检查好随身物品，认真看向你* 再确认一下，我们这次要完成什么目标？",
  },
]

const HISTORY_PILOT_CHOICE_CHAT_CONTEXT = [{
  role: "system",
  content: (
    "fablespace:reviewed-historical-choice\n"
    + "本轮只用一两句儿童有限视角回应访客已经显示的剧情选择，不新增具名人物、门牌、家庭人数、日期、"
    + "伤亡细节、水泵外观或其它未经核验的历史线索；亲眼所见与听说必须分开。"
  ),
}]

/**
 * Sorts generic in-character starter prompts for the current space mode.
 * These are visitor reply templates only; clicking one pre-fills text and does not auto-send.
 */
function getWorkbenchRoleplayStarters(space: Space, character: SpaceCharacter | undefined, firstMinuteGuide: ReturnType<typeof buildSpaceFirstMinuteGuide>) {
  const searchText = [
    space.description,
    space.scene_prompt,
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

type SpaceChatWorkbenchProps = {
  space: Space
  currentUserId: string
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

function gameplayStableKey(definition: GameplayDefinitionRecord) {
  return String(
    definition.id
    || definition.title
    || definition.entry_label
    || definition.summary
    || "published-story-step",
  )
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
  const choices: Array<{ id: string; label: string }> = []
  if (Array.isArray(node.choices)) {
    for (const choice of node.choices) {
      if (!choice?.id) continue
      choices.push({
        id: String(choice.id),
        label: textOrFallback(choice.label, String(choice.id)),
      })
    }
  }
  return {
    node_id: String(node.id || targetNodeId),
    narration: textOrFallback(node.narration, "故事正在推进。"),
    choices,
  }
}

function avatarSource(character: SpaceCharacter | undefined) {
  if (!character) return ""
  if (character.avatar) return mediaAssetUrl(character.avatar)
  if (character.image_url) return mediaAssetUrl(character.image_url)
  const sprites = character.sprites || {}
  return mediaAssetUrl(sprites.neutral || sprites.default || Object.values(sprites)[0] || "")
}


function canRenderImage(src: string) {
  return /^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith("data:")
}

const STORY_NARRATOR_ID = "__story_narrator__"

function entranceReactionContent(character: SpaceCharacter, spaceName: string) {
  const firstMessage = String(character.first_mes || "").trim()
  if (firstMessage) return firstMessage
  const name = character.name || "这里的角色"
  return `你进入${spaceName || "这个故事"}时，${name}向你点了点头。`
}

function entranceReactionMessages(characters: SpaceCharacter[], spaceName: string): ChatMessage[] {
  const timestamp = new Date().toISOString()
  return characters.map((character, index) => ({
    id: `entrance-${character.id || index}-${timestamp}`,
    role: "assistant",
    character_id: character.id,
    content: entranceReactionContent(character, spaceName),
    timestamp,
  }))
}

function hostGuideMessage(space: Space, _characters: SpaceCharacter[]): ChatMessage {
  const timestamp = new Date().toISOString()

  return {
    id: `host-guide-${timestamp}`,
    role: "assistant",
    character_id: STORY_NARRATOR_ID,
    content: `${space.name || "故事"}从这里开始。`,
    timestamp,
  }
}

function publicEntranceMessages(characters: SpaceCharacter[], space: Space): ChatMessage[] {
  return [hostGuideMessage(space, characters)]
}

function normalizeMentionName(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase()
}

function parsePublicMentionTarget(message: string, characters: SpaceCharacter[]) {
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
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  })
}

function chatMessageKey(line: ChatMessage) {
  return line.id || [
    line.role,
    line.character_id,
    line.visitor_id,
    line.timestamp,
    line.content,
  ].join(":")
}

function mapGroupResponseMessages(
  result: Awaited<ReturnType<typeof sendGroupChat>>,
): ChatMessage[] {
  const messages = Array.isArray(result.messages) ? result.messages : []
  const lines: ChatMessage[] = []
  for (const [index, groupMessage] of messages.entries()) {
    const content = String(groupMessage.content || "").trim()
    if (!content) continue
    lines.push({
      id: groupMessage.id || `local-group-${Date.now()}-${index}`,
      role: groupMessage.role || "assistant",
      content,
      character_id: groupMessage.character_id,
      visitor_name: groupMessage.visitor_name,
      fallback_notice: groupMessage.is_fallback === true
        ? String(groupMessage.fallback_notice || result.fallback_notice || "角色暂时无法给出有效回复，可以换个问法或稍后重试。")
        : "",
      timestamp: groupMessage.timestamp || new Date().toISOString(),
    })
  }
  const progress_echoes = progressEchoesFromChatResult(result)
  return lines.map((line, index) =>
    index === lines.length - 1 ? { ...line, progress_echoes } : line,
  )
}

function CharacterAvatar({ character, active }: { character?: SpaceCharacter; active?: boolean }) {
  const src = avatarSource(character)
  if (src && canRenderImage(src)) {
    return (
      <img
        src={src}
        alt={character?.name || "角色头像"}
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

export function SpaceChatWorkbench({
  space,
  currentUserId,
  publicPanel,
}: SpaceChatWorkbenchProps) {
  const characters = useMemo(() => (Array.isArray(space.characters) ? space.characters : []), [space.characters])
  const characterNameById = useMemo(
    () => new Map(characters.map((character) => [character.id, character.name || character.id || "角色"])),
    [characters],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCharacterRef = String(searchParams.get("character_ref") || "").trim()
  const requestedCharacter = requestedCharacterRef
    ? characters.find((character) => matchesPublicReference(requestedCharacterRef, "character", space.id, character.id))
    : undefined
  const [selectedCharacterId, setSelectedCharacterId] = useState(requestedCharacter?.id || characters[0]?.id || "")
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0],
    [characters, selectedCharacterId],
  )
  const visitorId = currentUserId
  const [visitorPlayIdentity] = useState(() => readVisitorPlayIdentity())
  const visitorName = "旅人"
  const visitorGender = visitorPlayIdentity?.gender || "unspecified"
  const playIdentityId = visitorPlayIdentity?.playIdentityId || ""
  const [message, setMessage] = useState("")
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [visitorState, setVisitorState] = useState<any>(null)
  const mentionRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [activeChatChannel, setActiveChatChannel] = useState<ChatChannel>(() => characters[0]?.id ? "private" : "public")
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([])
  const [privateMessagesByCharacterId, setPrivateMessagesByCharacterId] = useState<Record<string, ChatMessage[]>>({})
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const chatInitializationKeyRef = useRef("")
  const [pendingReplyTargetName, setPendingReplyTargetName] = useState("")

  const [gameplayDefinitions, setGameplayDefinitions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [gameplayScene, setGameplayScene] = useState<any>({})
  const [isGameplayBusy, setIsGameplayBusy] = useState(false)
  const [activeGameplayDefinitionId, setActiveGameplayDefinitionId] = useState("")
  const gameplayDeepLinkRequestRef = useRef("")
  const preferredGameplayIdRef = useRef("")
  const historyGameplayAutostartRef = useRef("")

  const requestedGameplayId = String(searchParams.get("gameplay_id") || "").trim()

  const canStartDeepLinkedGameplay = (
    String(space.status || "") === "open" &&
    space.is_open !== false
  )

  const isHistoryPilotStory = isHistoryPilotExperience(space.id, selectedCharacter?.id)
  const firstMinuteGuide = useMemo(() => buildSpaceFirstMinuteGuide(space), [space])
  const doorwayHost = selectedCharacter || characters[0]
  const doorwayGreeting = doorwayHost
    ? entranceReactionContent(doorwayHost, space.name)
    : "故事尚未配置角色。"
  const doorwayStarterLine = doorwayHost
    ? `你好，${doorwayHost.name || "在场角色"}。我刚进入故事，想先了解眼前发生了什么。`
    : "我刚进门，想先听听这里最值得注意的线索。"
  const shouldShowDoorway = false
  const doorwayGameplayDefinitions = useMemo(
    () => {
      const publishedDefinitions = gameplayDefinitions
        .filter((definition) => String(definition?.status || "published").toLowerCase() === "published")
      return publishedDefinitions.slice(0, 3)
    },
    [gameplayDefinitions],
  )
  const doorwayEntryActions = firstMinuteGuide.quickActions.slice(0, 3)
  const visibleMessages = activeChatChannel === "public"
    ? publicMessages
    : privateMessagesByCharacterId[selectedCharacter?.id || ""] || []
  const hasVisitorSentMessage = visibleMessages.some((line) => line.role === "user")
  const roleplayStarterPrompts = useMemo(
    () => getWorkbenchRoleplayStarters(space, selectedCharacter, firstMinuteGuide),
    [space, selectedCharacter, firstMinuteGuide],
  )
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return []
    if (!mentionQuery) return characters
    const query = mentionQuery.toLowerCase()
    return characters.filter((char) => (char.name || char.id || "").toLowerCase().includes(query))
  }, [characters, mentionQuery])
  useEffect(() => {
    if (requestedCharacter?.id && requestedCharacter.id !== selectedCharacterId) {
      setSelectedCharacterId(requestedCharacter.id)
      return
    }
    if (characters.length && !characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].id)
    }
  }, [characters, requestedCharacter, selectedCharacterId])

  useEffect(() => {
    let cancelled = false
    enterSpace(space.id, visitorId, visitorGender, playIdentityId)
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
  }, [playIdentityId, space.id, visitorGender, visitorId])

  useEffect(() => {
    const initKey = space.id
    const shouldReplaceInitialMessages = chatInitializationKeyRef.current !== initKey
    chatInitializationKeyRef.current = initKey

    // Familiar characters may greet in their private conversation.
    const friendlyNpcs = characters.filter(c => {
      const stage = visitorState?.relationship?.stage || "stranger"
      return ["familiar", "friend", "close_friend", "best_friend"].includes(stage)
    })

    if (shouldReplaceInitialMessages) {
      setActiveChatChannel(characters[0]?.id ? "private" : "public")
    }
    
    // Do not overwrite an in-flight first message when visitor state arrives later.
    const publicGreetings = publicEntranceMessages(characters, space)
    setPublicMessages((current) =>
      shouldReplaceInitialMessages || current.length === 0 ? publicGreetings : current,
    )

    // The selected character greets immediately; familiar characters can add
    // relationship-aware greetings.
    const privateGreetings: Record<string, ChatMessage[]> = {}
    const primaryNpc = characters[0]
    if (primaryNpc?.id) {
      privateGreetings[primaryNpc.id] = [{
        id: `entrance-private-${primaryNpc.id}-${Date.now()}`,
        role: "assistant",
        character_id: primaryNpc.id,
        content: entranceReactionContent(primaryNpc, space.name),
        timestamp: new Date().toISOString(),
      }]
    }
    friendlyNpcs.forEach(npc => {
      privateGreetings[npc.id] = [{
        id: `entrance-private-${npc.id}-${Date.now()}`,
        role: "assistant",
        character_id: npc.id,
        content: entranceReactionContent(npc, space.name),
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

  }, [characters, space, visitorState])

  useEffect(() => {
    if (!requestedGameplayId) gameplayDeepLinkRequestRef.current = ""

    // Load gameplays and sessions
    let cancelled = false
    const startLoadedGameplay = async (definition: GameplayDefinitionRecord) => {
      const gameplayId = String(definition.id || "")
      preferredGameplayIdRef.current = gameplayId
      setActiveGameplayDefinitionId(gameplayId)
      setIsGameplayBusy(true)
      try {
        const res = await startGameplaySession(space.id, {
          gameplay_id: gameplayId,
          character_id: selectedCharacter?.id,
          visitor_id: visitorId,
          visitor_name: visitorName,
        }, visitorId)
        if (cancelled) return
        const responseSession = res.session as Record<string, any> | undefined
        const session = responseSession || { ...res, id: res.session_id, gameplay_id: gameplayId }
        setActiveSession(session)
        const sessionRecord = session as Record<string, any>
        const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
        setGameplayScene(res.scene || lastEvent?.scene || sceneFromGameplayDefinition(definition, sessionRecord.current_node_id))
      } finally {
        if (!cancelled) setIsGameplayBusy(false)
      }
    }
    const loadGameplayData = async () => {
      try {
        const [defsRes, sessionsRes] = await Promise.all([
          getGameplays(space.id, visitorId),
          requestedGameplayId
            ? Promise.resolve({ sessions: [], count: 0 })
            : listGameplaySessions(space.id, { state: "active", visitor_id: visitorId }, visitorId),
        ])
        if (cancelled) return
        const definitions = defsRes.gameplays || defsRes.gameplay_definitions || []
        setGameplayDefinitions(definitions)

        if (requestedGameplayId) {
          const requestKey = `${space.id}:${requestedGameplayId}`
          if (gameplayDeepLinkRequestRef.current === requestKey) return
          gameplayDeepLinkRequestRef.current = requestKey

          const nextSearchParams = new URLSearchParams(searchParams)
          nextSearchParams.delete("gameplay_id")

          if (!canStartDeepLinkedGameplay) {
            setError("该故事当前未公开开放，不能直接开始。")
            setSearchParams(nextSearchParams, { replace: true, preventScrollReset: true })
            return
          }

          const requestedDefinition = definitions.find((definition: any) => (
            String(definition?.id || "") === requestedGameplayId &&
            String(definition?.status || "").toLowerCase() === "published"
          ))
          if (!requestedDefinition) {
            setError("指定故事章节不存在、未发布或已停用。")
            setSearchParams(nextSearchParams, { replace: true, preventScrollReset: true })
            return
          }

          await startLoadedGameplay(requestedDefinition)
          if (!cancelled) setSearchParams(nextSearchParams, { replace: true, preventScrollReset: true })
          return
        }

        if (sessionsRes.sessions?.length > 0) {
          const preferredGameplayId = preferredGameplayIdRef.current
          const session = sessionsRes.sessions.find((candidate) => (
            String(candidate?.gameplay_id || candidate?.definition_id || "") === preferredGameplayId
          )) || sessionsRes.sessions[0]
          setActiveSession(session)
          const sessionRecord = session as Record<string, any>
          const sessionGameplayId = String(sessionRecord.gameplay_id || sessionRecord.definition_id || "")
          const definition = definitions.find((item: any) => String(item?.id || "") === sessionGameplayId)
          const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
          setActiveGameplayDefinitionId(sessionGameplayId)
          setGameplayScene(lastEvent?.scene || sceneFromGameplayDefinition(definition, sessionRecord.current_node_id))
        } else if (isHistoryPilotStory) {
          const historyDefinition = definitions.find((definition: any) => (
            isHistoryPilotGameplay(definition?.id) &&
            String(definition?.status || "published").toLowerCase() === "published"
          ))
          const autostartKey = `${space.id}:${visitorId}:${HISTORY_PILOT_GAMEPLAY_ID}`
          if (!historyDefinition) {
            setError("安妮的故事暂时不可用，请稍后重试。")
          } else if (historyGameplayAutostartRef.current !== autostartKey) {
            historyGameplayAutostartRef.current = autostartKey
            await startLoadedGameplay(historyDefinition)
          }
        }
      } catch (err) {
        if (cancelled) return
        if (requestedGameplayId) {
          const nextSearchParams = new URLSearchParams(searchParams)
          nextSearchParams.delete("gameplay_id")
          setError(`无法打开指定故事章节：${errorMessage(err)}`)
          setSearchParams(nextSearchParams, { replace: true, preventScrollReset: true })
          return
        }
        if (isHistoryPilotStory) {
          historyGameplayAutostartRef.current = ""
          setError(`安妮的故事暂时无法开始：${errorMessage(err)}`)
          return
        }
        console.error("Failed to load gameplay data:", err)
      }
    }
    void loadGameplayData()
    return () => {
      cancelled = true
    }
  }, [space, visitorId, visitorName, selectedCharacter?.id, requestedGameplayId, searchParams, setSearchParams, canStartDeepLinkedGameplay, isHistoryPilotStory])

  useEffect(() => {

    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, busy, gameplayScene?.node_id])

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
        ? String(result.fallback_notice || "角色暂时无法给出有效回复，可以换个问法或稍后重试。")
        : "",
      timestamp: now,
    }
  }

  function ensurePrivateEntranceMessage(character: SpaceCharacter) {
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
          content: entranceReactionContent(character, space.name),
          timestamp,
        }],
      }
    })
  }

  async function sendPrivateChat(cleanMessage: string, extraContext: Array<Record<string, unknown>> = []) {
    if (!selectedCharacter) return
    const userLine = buildUserLine(cleanMessage, selectedCharacter.id)
    setPendingReplyTargetName(selectedCharacter.name || selectedCharacter.id || "角色")
    appendPrivateMessages(selectedCharacter.id, [userLine])

    const result = await sendSpaceChat(space.id, {
      character_id: selectedCharacter.id,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_gender: visitorGender,
      play_identity_id: playIdentityId,
      message: cleanMessage,
      display_message: cleanMessage,
      ...(extraContext.length ? { extra_context: extraContext } : {}),
    })
    const responseText = String(result.response || "").trim()
    if (responseText) {
        appendPrivateMessages(selectedCharacter.id, [buildAssistantLine(responseText, selectedCharacter.id, result)])
    } else if (result.degradation?.message) {
      setError(result.degradation.message)
    }
  }

  async function sendPublicChat(cleanMessage: string) {
    const mention = parsePublicMentionTarget(cleanMessage, characters)
    const targetCharacter = mention?.character
    setPendingReplyTargetName(targetCharacter ? characterNameById.get(targetCharacter.id) || targetCharacter.name || "角色" : "")

    setPublicMessages((current) => [...current, buildUserLine(cleanMessage, targetCharacter?.id)])

    if (targetCharacter) {
      const result = await sendSpaceChat(space.id, {
        character_id: targetCharacter.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        play_identity_id: playIdentityId,
        message: mention?.message || cleanMessage,
        display_message: cleanMessage,
      })
      const responseText = String(result.response || "").trim()
      if (responseText) {
        setPublicMessages((current) => [...current, buildAssistantLine(responseText, targetCharacter.id, result)])
      } else if (result.degradation?.message) {
        setError(result.degradation.message)
      }
      return
    }

    if (characters.length > 1 && Boolean((space as { group_chat_enabled?: unknown }).group_chat_enabled)) {
      const result = await sendGroupChat(space.id, {
        message: cleanMessage,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        play_identity_id: playIdentityId,
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
    if (!cleanMessage) return
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
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    })
  }

  /**
   * Turns a doorway quick action into a prepared chat prompt without making an
   * API call; the user still has to press Send to commit the interaction.
   */
  function handleDoorwayQuickAction(action: SpaceFirstMinuteAction) {
    prepareDoorwayPrompt(action.prompt)
  }

  /**
   * Starts one published doorway gameplay as an explicit visitor action. This
   * uses the existing gameplay session API and never sends a chat message.
   */
  async function handleDoorwayStartGameplay(definition: GameplayDefinitionRecord) {
    setMessage("")
    setMentionQuery(null)
    setMentionIndex(0)
    await handleStartGameplay(definition)
  }

  async function handleStartGameplay(definition: any) {
    setIsGameplayBusy(true)
    setError("")
    const gameplayId = String(definition?.id || "")
    preferredGameplayIdRef.current = gameplayId
    setActiveGameplayDefinitionId(gameplayId)
    try {
      const res = await startGameplaySession(space.id, {
        gameplay_id: definition.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
      }, visitorId)
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
      const res = await advanceGameplaySession(space.id, activeSession.id, data, visitorId)
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

  async function handleHistoryStoryChoice(choice: { id: string; label?: string }) {
    const choiceText = String(choice.label || choice.id || "").trim()
    if (!choiceText || !activeSession || !selectedCharacter || busy === "send" || isGameplayBusy) return

    setBusy("send")
    setError("")
    try {
      await sendPrivateChat(choiceText, HISTORY_PILOT_CHOICE_CHAT_CONTEXT)
      await handleAdvanceGameplay({ choice_id: choice.id })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPendingReplyTargetName("")
      setBusy("")
    }
  }

  async function handleAbandonGameplay() {
    if (!activeSession) return
    if (!confirm("确定要放弃当前的故事进度吗？")) return
    setIsGameplayBusy(true)
    setError("")
    try {
      await abandonGameplaySession(space.id, activeSession.id, visitorId)
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
  }

  /**
   * Starts a fresh local story branch from the space entrance.
   * This clears only transient UI chat state and never deletes visitor memory,
   * relationship records, persisted messages, or gameplay sessions.
   */
  function handleStartFreshEntranceBranch() {
    setPublicMessages(publicEntranceMessages(characters, space))
    setPrivateMessagesByCharacterId({})
    setActiveChatChannel(characters[0]?.id ? "private" : "public")
    setSelectedCharacterId(characters[0]?.id || "")
    setMessage("")
    setMentionQuery(null)
    setMentionIndex(0)
    setPendingReplyTargetName("")
    setActiveSession(null)
    setGameplayScene({})
    setActiveGameplayDefinitionId("")
    setError("")
    window.requestAnimationFrame(() => {
      chatLogRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  const currentGameplay = useMemo(() => {
    const sessionDefinitionId = String(activeSession?.gameplay_id || activeSession?.definition_id || activeGameplayDefinitionId || "")
    return gameplayDefinitions.find((definition) => String(definition?.id || "") === sessionDefinitionId) || gameplayDefinitions[0]
  }, [activeGameplayDefinitionId, activeSession, gameplayDefinitions])


  return (

    <section data-chat-workbench="story" data-active-chat-channel={activeChatChannel} className="h-full">
      <div className="flex h-full min-h-[30rem] overflow-hidden rounded-[1rem] border border-cyan-200/12 bg-[linear-gradient(180deg,rgba(27,33,68,0.94)_0%,rgba(13,18,38,0.97)_100%)] shadow-[0_18px_48px_rgba(4,7,22,0.32)]">
        {/* 移除了冗余的 space.name header bar - 标题已在 Hero Panel 展示 */}

        {shouldShowDoorway ? (
          <section
            data-space-doorway-ritual
            data-first-minute-play-entry
            className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
          >
            {/* 左侧：场景 + 动作入口 */}
            <div className="rounded-[1.75rem] border border-cyan-200/18 bg-cyan-300/[0.075] p-5 shadow-[0_18px_48px_rgba(89,102,187,0.16)] max-lg:mb-20">
              {/* 场景提示作为主标题 */}
              <h2 className="text-3xl font-black leading-tight text-white">{firstMinuteGuide.sceneHint}</h2>
              {/* 「现在做」区块 */}
              {firstMinuteGuide.playObjective && (
                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/58">现在做</p>
                  <p className="mt-1 text-sm font-bold text-cyan-50/88">{firstMinuteGuide.playObjective}</p>
                </div>
              )}
              {/* 动作入口按钮（带分类标签） */}
              <div className="mt-5 grid gap-2" data-first-minute-action-deck>
                {doorwayEntryActions.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    data-first-minute-action={action.id}
                    onClick={() => handleDoorwayQuickAction(action)}
                    className="flex flex-col gap-1 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.075] px-4 py-3 text-left transition hover:border-cyan-200/38 hover:bg-cyan-300/[0.12] focus:outline-none focus:ring-4 focus:ring-cyan-300/20 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-200/12 text-xs font-black text-cyan-50">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-bold text-cyan-50">{action.label}</span>
                      {action.helper && (
                        <span className="text-xs font-bold text-cyan-100/50">{action.helper}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 右侧：角色与故事入口 */}
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-violet-200/18 bg-slate-950/65 p-5">
              {/* Host Role 标签 */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200/16 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-100">
                <Sparkles className="h-3.5 w-3.5" />
                {firstMinuteGuide.hostRole}
              </div>

              {/* 角色接待区域 */}
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <CharacterAvatar character={doorwayHost} active />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white">{doorwayHost?.name || "故事角色"}</p>
                  <p className="mt-1 text-xs font-bold text-cyan-100/54">{characters.length} 位角色在场</p>
                  <p data-doorway-host-greeting className="mt-2 text-sm leading-6 text-violet-50/78">
                    {doorwayGreeting}
                  </p>
                </div>
              </div>

              {/* 可接任务 */}
              {doorwayGameplayDefinitions.length ? (
                <div className="space-y-2" data-doorway-gameplay-list>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/58">可接任务</p>
                  {doorwayGameplayDefinitions.map((definition) => (
                    <button
                      key={gameplayStableKey(definition)}
                      type="button"
                      data-doorway-gameplay-entry={gameplayStableKey(definition)}
                      disabled={isGameplayBusy}
                      onClick={() => void handleDoorwayStartGameplay(definition)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-cyan-200/16 bg-cyan-300/[0.065] px-4 py-3 text-left transition hover:border-cyan-200/38 hover:bg-cyan-300/[0.12] focus:outline-none focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-cyan-50">
                          {gameplayDisplayText(definition, "entry_label", gameplayDisplayText(definition, "title", "开始这个章节"))}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-bold text-violet-100/58">
                          {gameplayDisplayText(definition, "summary", "")}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-cyan-100/50" />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* 选一句开口 */}
              {roleplayStarterPrompts.length ? (
                <div className="space-y-2" data-roleplay-starter-prompts>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/68">
                    选一句开口
                  </p>
                  <div className="grid gap-2">
                    {roleplayStarterPrompts.map((starter) => (
                      <button
                        key={starter.id}
                        type="button"
                        data-roleplay-starter={starter.id}
                        onClick={() => prepareDoorwayPrompt(starter.prompt)}
                        className="flex items-center gap-3 rounded-xl border border-amber-200/18 bg-amber-300/[0.065] px-4 py-3 text-left transition hover:border-amber-200/42 hover:bg-amber-300/[0.12] focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                      >
                        <span className="text-sm font-black text-amber-50">{starter.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 主按钮 */}
              <Button type="button" data-doorway-start-chat className="min-h-12 w-full" onClick={handleDoorwayStartChat}>
                {doorwayGameplayDefinitions.length ? "和角色打招呼 →" : `${firstMinuteGuide.startLabel} →`}
              </Button>
            </div>
          </section>
        ) : null}

        {!shouldShowDoorway ? (
          <>

        <div className={`grid h-full min-h-0 w-full grid-cols-1 lg:items-stretch ${isHistoryPilotStory ? "" : "lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)]"}`}>
          {!isHistoryPilotStory ? (
          <aside className="hidden min-h-0 flex-col border-b border-white/10 bg-slate-950/24 lg:flex lg:overflow-hidden lg:border-b-0 lg:border-r lg:border-cyan-200/10" aria-label="角色与故事任务">
            <div className="shrink-0 px-3 pb-2 pt-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-white">驻场角色</h2>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                  {characters.length}
                </span>
              </div>
            </div>
            <div className="flex min-h-0 gap-2 overflow-x-auto px-3 pb-3 lg:block lg:flex-1 lg:space-y-2 lg:overflow-y-auto">
              {characters.length ? (
                characters.map((character) => {
                  const active = activeChatChannel === "private" && character.id === selectedCharacter?.id
                  return (
                    <button
                      key={character.id}
                      type="button"
                      data-private-chat-channel
                      aria-pressed={active}
                      onClick={() => selectCharacter(character.id)}
                      className={`flex w-[15.5rem] min-w-0 shrink-0 items-start gap-3 rounded-2xl border p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/8 lg:w-full lg:shrink ${
                        active ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_14px_34px_rgba(89,102,187,0.20)]" : "border-white/10 bg-slate-950/30"
                      }`}
                    >
                      <CharacterAvatar character={character} active={active} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white">{character.name || character.id}</span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="min-w-[16rem] rounded-2xl border border-dashed border-white/15 bg-slate-950/35 p-4 text-sm leading-6 text-violet-50/62 lg:min-w-0">
                  暂无角色
                </div>
              )}
            </div>
            <div className="shrink-0 space-y-3 border-t border-cyan-200/10 bg-slate-950/26 p-3">
              {doorwayGameplayDefinitions.length ? (
                <div className="space-y-2" data-doorway-gameplay-list>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/54">可接任务</p>
                  {doorwayGameplayDefinitions.slice(0, 2).map((definition) => (
                    <button
                      key={gameplayStableKey(definition)}
                      type="button"
                      data-doorway-gameplay-entry={gameplayStableKey(definition)}
                      disabled={isGameplayBusy}
                      onClick={() => void handleDoorwayStartGameplay(definition)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-cyan-200/16 bg-cyan-300/[0.065] px-3 py-2.5 text-left transition hover:border-cyan-200/38 hover:bg-cyan-300/[0.12] focus:outline-none focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-cyan-50">
                          {gameplayDisplayText(definition, "entry_label", gameplayDisplayText(definition, "title", "开始任务"))}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.68rem] font-bold text-violet-100/52">
                          {gameplayDisplayText(definition, "summary", "")}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-cyan-100/50" />
                    </button>
                  ))}
                </div>
              ) : null}
              {roleplayStarterPrompts.length ? (
                <div className="space-y-2" data-roleplay-starter-prompts>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/58">开口模板</p>
                  {roleplayStarterPrompts.slice(0, 2).map((starter) => (
                    <button
                      key={starter.id}
                      type="button"
                      data-roleplay-starter={starter.id}
                      onClick={() => prepareDoorwayPrompt(starter.prompt)}
                      className="w-full rounded-xl border border-amber-200/16 bg-amber-300/[0.055] px-3 py-2 text-left text-xs font-black text-amber-50/82 transition hover:border-amber-200/38 hover:bg-amber-300/[0.10]"
                    >
                      {starter.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                data-public-chat-channel
                aria-pressed={activeChatChannel === "public"}
                onClick={selectPublicChannel}
                className={`flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                  activeChatChannel === "public" ? "border-cyan-300/45 bg-cyan-300/12" : "border-white/10 bg-slate-950/30"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/12 text-cyan-50 ring-1 ring-cyan-200/25">
                  <UsersRound className="h-4 w-4" />
                </span>
                <span className="block truncate text-xs font-black text-white">公共聊天</span>
              </button>
            </div>
          </aside>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#151a38]/70">
            {!isHistoryPilotStory ? (
            <div className="border-b border-cyan-200/10 px-3 py-2.5 sm:px-4">
              <div
                data-current-npc-stage-card
                aria-label={activeChatChannel === "public" ? "多人对话" : "当前角色"}
                className="rounded-xl border border-cyan-200/10 bg-white/[0.035] p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {activeChatChannel === "public" ? (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/16 bg-cyan-300/12 text-cyan-50">
                      <UsersRound className="h-5 w-5" />
                    </span>
                  ) : (
                    <CharacterAvatar character={selectedCharacter} active />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/45">
                      {activeChatChannel === "public" ? "公共频道" : "当前角色"}
                    </p>
                    <h2 className="mt-0.5 truncate text-base font-black text-white sm:text-lg">
                      {activeChatChannel === "public" ? "多人对话" : selectedCharacter?.name || "暂无角色"}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
            ) : null}
            {activeSession && !isHistoryPilotStory ? (
              <div className="p-4">
                <StoryProgressPanel
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

            <div
              ref={chatLogRef}
              data-entrance-reactions
              data-chat-log-compact
              aria-label="聊天记录"
              className="min-h-[8rem] flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
            >
              {visibleMessages.map((line) => {
                const isUser = line.role === "user"
                const targetName = characterNameById.get(line.character_id || "")
                const speakerName = isUser
                  ? activeChatChannel === "public" && targetName
                    ? `${visitorName || visitorId} → @${targetName}`
                    : visitorName || visitorId
                  : line.character_id === STORY_NARRATOR_ID
                    ? "旁白"
                    : targetName || "角色"
                return (
                  <div key={chatMessageKey(line)} className={`flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-[1.2rem] px-4 py-3 text-sm leading-6 shadow-lg ${
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
              {isHistoryPilotStory && activeSession ? (
                <HistoricalBroadStreetStory
                  session={activeSession}
                  scene={gameplayScene}
                  busy={busy === "send" || isGameplayBusy}
                  onChoice={handleHistoryStoryChoice}
                />
              ) : null}
              {busy === "send" ? (
                <div className="flex justify-start">
                  <div className="rounded-[1.35rem] rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-violet-50/68">
                    {pendingReplyTargetName
                      ? `${pendingReplyTargetName} 正在回复…`
                      : activeChatChannel === "public"
                        ? "角色们正在回应…"
                        : `${selectedCharacter?.name || "角色"} 正在回复…`}
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="border-t border-white/10 px-4 py-3">
                <p className="rounded-2xl border border-red-300/25 bg-red-300/10 p-3 text-sm leading-6 text-red-50">{error}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} data-chat-composer="fast-entry" className="border-t border-cyan-200/10 bg-slate-950/62 p-3">
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
                    disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send"}
                    aria-label={activeChatChannel === "public" ? "公共聊天输入" : "当前角色聊天输入"}
                    rows={2}
                    maxLength={1600}
                    placeholder={activeChatChannel === "public" ? "对在场角色说点什么…" : `对 ${selectedCharacter?.name || "角色"} 说点什么…`}
                    className="min-h-14 w-full resize-none rounded-2xl border border-cyan-200/14 bg-white/[0.055] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-violet-100/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  {mentionQuery !== null && mentionMatches.length > 0 && activeChatChannel === "public" && (
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || !message.trim()} className="min-h-14 sm:w-28">
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </form>

            {!isHistoryPilotStory && hasVisitorSentMessage ? (
              <section
                data-story-branch-controls
                className="flex justify-end border-t border-white/10 bg-slate-950/60 px-3 py-2 sm:px-4"
                aria-label="故事支线控制"
              >
                <button
                  type="button"
                  data-start-fresh-branch
                  onClick={handleStartFreshEntranceBranch}
                  disabled={busy === "send" || isGameplayBusy}
                  className="min-h-10 shrink-0 rounded-xl border border-cyan-200/25 bg-slate-950/34 px-4 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-200/48 hover:bg-cyan-300/[0.10] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  新支线
                </button>
              </section>
            ) : null}
          </main>
        </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

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
import { buildTavernFirstMinuteGuide } from "../../lib/tavern-first-minute"

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

  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const [lastGift, setLastGift] = useState<{ coins: number; items: string } | null>(null)
  const [hasPassedDoorway, setHasPassedDoorway] = useState(Boolean(isOwner))

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
  const visibleMessages = activeChatChannel === "public"
    ? publicMessages
    : privateMessagesByCharacterId[selectedCharacter?.id || ""] || []
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

    // Identify shopkeeper NPC
    const shopkeeperNpc = characters.find(c => 
      c.name?.includes("店长") || 
      c.tags?.some(t => t.toLowerCase().includes("shopkeeper") || t.includes("店长"))
    )

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
        setGameplayDefinitions(defsRes.gameplay_definitions || [])
        if (sessionsRes.sessions?.length > 0) {
          const session = sessionsRes.sessions[0]
          setActiveSession(session)
          // Initial scene from last event if possible
          const sessionRecord = session as Record<string, any>
          const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
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
    if (doorwayHost?.id) {
      ensurePrivateEntranceMessage(doorwayHost)
      setSelectedCharacterId(doorwayHost.id)
      setActiveChatChannel("private")
    } else {
      setActiveChatChannel("public")
    }
    setMessage(doorwayStarterLine)
    setMentionQuery(null)
    setMentionIndex(0)
    setError("")
    setHasPassedDoorway(true)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    })
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
      const sessionRecord = session as Record<string, any>
      const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
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
          const sessionRecord = session as Record<string, any>
          const lastEvent = Array.isArray(sessionRecord.events) ? sessionRecord.events[sessionRecord.events.length - 1] : null
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

  const isOrphanEchoMode = (tavern as Record<string, unknown>).special_type === "divination" || searchParams.get("ui_style") === "orphan-echo"
  const miniGameTemplates = getMiniGameTemplates()
  const currentGameplay = gameplayDefinitions[0] // Default to first for now if session starts


  return (

    <section data-chat-workbench="sillytavern-style" data-active-chat-channel={activeChatChannel} className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/72 shadow-2xl shadow-cyan-950/20">
        <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3 sm:px-6">
          <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl">{tavern.name}</h1>
        </div>

        {shouldShowDoorway ? (
          <section
            data-tavern-doorway-ritual
            className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
          >
            <div className="rounded-[1.75rem] border border-cyan-200/18 bg-cyan-300/[0.075] p-5 shadow-[0_18px_48px_rgba(8,145,178,0.08)]">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/20 bg-slate-950/40 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                <MapPin className="h-3.5 w-3.5" />
                Real coordinate doorway
              </div>
              <h2 className="text-3xl font-black leading-tight text-white">先推门，再聊天</h2>
              <p data-doorway-map-anchor className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm font-bold leading-6 text-cyan-50/76">
                {firstMinuteGuide.anchorLine}
              </p>
              <p className="mt-4 text-sm leading-7 text-violet-50/72">{firstMinuteGuide.whyHere}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-cyan-100">
                  {firstMinuteGuide.experienceType}
                </span>
                <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-violet-100/70">
                  {characters.length} 位 NPC 在场
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-violet-200/16 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-100">
                <Sparkles className="h-3.5 w-3.5" />
                正在接待
              </div>
              <div className="flex items-start gap-3">
                <CharacterAvatar character={doorwayHost} active />
                <div className="min-w-0">
                  <p className="font-black text-white">{doorwayHost?.name || "驻场 NPC"}</p>
                  <p data-doorway-host-greeting className="mt-2 rounded-3xl rounded-tl-sm border border-white/10 bg-slate-950/45 p-4 text-sm leading-7 text-violet-50/78">
                    {doorwayGreeting}
                  </p>
                </div>
              </div>
              <Button type="button" data-doorway-start-chat className="mt-5 min-h-12 w-full" onClick={handleDoorwayStartChat}>
                推门进店，和 NPC 打招呼 →
              </Button>
              <p className="mt-3 text-xs leading-5 text-violet-100/52">
                点击只会切到私聊并填入开场白，不会替你自动发送消息。
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
                <Button type="submit" disabled={(activeChatChannel === "private" && !selectedCharacter) || characters.length === 0 || busy === "send" || passwordLocked || !message.trim()} className="min-h-14 sm:w-28">
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </form>

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

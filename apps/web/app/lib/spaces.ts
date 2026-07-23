import { jsonInit, readApiJson } from "./api-client"
import { getOrCreateVisitorIdentity } from "./anonymous-visitor"
import type { VisitorPlayIdentityId } from "./visitor-play-identity"

export const DEFAULT_VISITOR_ID: string = getOrCreateVisitorIdentity()

export type Gender = "unspecified" | "female" | "male" | "nonbinary" | "other"

export type SpaceCharacter = {
  id: string
  name: string
  description?: string
  personality?: string
  scenario?: string
  gender?: Gender | string
  system_prompt?: string
  first_mes?: string
  mes_example?: string
  alternate_greetings?: string[]
  avatar?: string
  image_url?: string
  sprites?: Record<string, string>
  appearance?: Record<string, unknown>
  talkativeness?: number
  tags?: string[]
  hobbies?: string[]
  [key: string]: any
}

export type VisitorStatePayload = {
  visitor_id?: string
  space_id?: string
  gender?: Gender | string
  visit_count?: number
  first_visit?: string | null
  last_visit?: string | null
  relationship?: Record<string, unknown> | null
  [key: string]: unknown
}

export type Space = {
  id: string
  name: string
  description?: string
  status?: string
  access?: string
  scene_prompt?: string
  characters?: SpaceCharacter[]
  gameplay_definitions?: Record<string, unknown>[]
  is_open?: boolean
  visitor_state?: VisitorStatePayload | null
  [key: string]: any
}

export type SpaceListResponse = {
  spaces: Space[]
  count: number
  total?: number | null
  limit?: number | null
  offset?: number
  has_more?: boolean
}

export type ConversationProgressEcho = {
  type?: string
  message?: string
  details?: Record<string, unknown>
  id?: string
  label?: string
  detail?: string
  tone?: string
}

export type ChatMessage = {
  id?: string
  role: "user" | "assistant" | string
  content: string
  character_id?: string
  visitor_id?: string
  visitor_name?: string
  visitor_gender?: Gender | string
  timestamp?: string
  progress_echoes?: ConversationProgressEcho[]
  fallback_notice?: string
  conflicts?: Record<string, unknown>[]
}

export type ChatResponse = {
  character_id: string
  character_name: string
  response: string
  is_fallback?: boolean
  fallback_notice?: string
  degraded?: boolean
  degradation?: {
    title?: string
    message?: string
    action?: string
  } | null
  visitor_state?: VisitorStatePayload | null
  affinity?: Record<string, unknown> | null
  created_memories?: unknown[]
  conflicts?: Record<string, unknown>[]
}

export type GroupChatMessage = {
  id?: string
  role?: string
  content: string
  character_id?: string
  character_name?: string
  visitor_name?: string
  avatar?: string
  timestamp?: string
  degraded?: boolean
  is_fallback?: boolean
  fallback_notice?: string
}

export type GroupChatResponse = {
  messages: GroupChatMessage[]
  speaker_count?: number
  strategy?: string
  degraded?: boolean
  is_fallback?: boolean
  fallback_notice?: string
  error?: string
  visitor_state?: VisitorStatePayload | null
  affinity?: Record<string, unknown> | null
  created_memories?: unknown[]
  conflicts?: Record<string, unknown>[]
}

function queryString(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ""
}

export type SpaceDetailView = "entry"

export function getSpace(
  spaceId: string,
  userId = "",
  options: { view?: SpaceDetailView } = {},
) {
  return readApiJson<Space>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}${queryString({
      view: options.view,
    })}`,
    { userId },
  )
}

export function enterSpace(
  spaceId: string,
  userId = DEFAULT_VISITOR_ID,
  visitorGender: Gender | string = "",
  playIdentityId: VisitorPlayIdentityId | "" = "",
) {
  return readApiJson<{
    ok: boolean
    first_mes?: string
    visitor_state?: VisitorStatePayload | null
  }>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/enter`,
    jsonInit(
      "POST",
      {
        visitor_gender: visitorGender,
        play_identity_id: playIdentityId,
      },
      userId,
    ),
  )
}

export function sendSpaceChat(
  spaceId: string,
  data: {
    character_id: string
    message: string
    visitor_id: string
    visitor_name?: string
    visitor_gender?: Gender | string
    play_identity_id?: VisitorPlayIdentityId | ""
    display_message?: string
    extra_context?: Array<Record<string, unknown>>
  },
) {
  return readApiJson<ChatResponse>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/chat`,
    jsonInit("POST", data, data.visitor_id),
  )
}

export function sendGroupChat(
  spaceId: string,
  data: {
    message: string
    visitor_id: string
    visitor_name?: string
    visitor_gender?: Gender | string
    play_identity_id?: VisitorPlayIdentityId | ""
    display_message?: string
  },
) {
  return readApiJson<GroupChatResponse>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/group-chat`,
    jsonInit("POST", data, data.visitor_id),
  )
}

export function getGameplays(
  spaceId: string,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    gameplays?: Record<string, unknown>[]
    gameplay_definitions?: Record<string, unknown>[]
  }>(`/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplays`, { userId })
}

export function startGameplaySession(
  spaceId: string,
  data: {
    gameplay_id?: string
    definition_id?: string
    character_id?: string
    name?: string
    visitor_id?: string
    visitor_name?: string
  },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    ok?: boolean
    resumed?: boolean
    session?: Record<string, unknown>
    scene?: Record<string, unknown>
    session_id?: string
    state?: string
    definition_id?: string
    definition_name?: string
  }>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions`,
    jsonInit(
      "POST",
      {
        ...data,
        gameplay_id: data.gameplay_id || data.definition_id,
      },
      userId,
    ),
  )
}

export function advanceGameplaySession(
  spaceId: string,
  sessionId: string,
  data: { choice_id?: string; message?: string } = {},
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    ok: boolean
    session?: Record<string, unknown>
    event?: Record<string, unknown>
    scene?: Record<string, unknown>
    completed?: boolean
  }>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/advance`,
    jsonInit("POST", data, userId),
  )
}

export function abandonGameplaySession(
  spaceId: string,
  sessionId: string,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ ok: boolean; session: Record<string, unknown> }>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/abandon`,
    jsonInit("POST", {}, userId),
  )
}

export function listGameplaySessions(
  spaceId: string,
  options: { state?: string; visitor_id?: string } = {},
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    sessions: Record<string, unknown>[]
    count: number
  }>(
    `/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions${queryString({
      state: options.state,
      visitor_id: options.visitor_id,
    })}`,
    { userId },
  )
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "未知错误")
}

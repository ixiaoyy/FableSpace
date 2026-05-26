import { jsonInit, readApiBlob, readApiJson } from "./api-client"
import { getOrCreateVisitorIdentity } from "./tavern-runtime-config.js"

export const DEFAULT_OWNER_ID: string = ""
export const DEFAULT_VISITOR_ID: string = getOrCreateVisitorIdentity()

export type Gender = "unspecified" | "female" | "male" | "nonbinary" | "other"

/** NPC 仿真生理与心理状态 (mirror of backend NpcSimulationState) */
export type NpcSimulationState = {
  energy: number       // 0-100 体力
  hunger: number       // 0-100 饱腹度
  thirst: number       // 0-100 水分
  social: number       // 0-100 社交需求
  entertainment: number // 0-100 娱乐/心情
  mood: number         // 0-100 心情 (50=中性)
  last_tick_at?: string
}

/** A single social memory entry exchanged between NPCs */
export type NpcSocialMemory = {
  content: string
  source_name: string
  timestamp: string
}

export type TavernCharacter = {
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
  // ── Simulation & Mobility ──────────────
  current_tavern_id?: string
  home_tavern_id?: string
  simulation_state?: NpcSimulationState
  traits?: string[]
  social_memories?: NpcSocialMemory[]
  is_visitor?: boolean
  lat?: number | null
  lon?: number | null
}

export type RoleplayMode = "ai_only" | "hybrid"

export type TavernLayoutStyle = "lobby" | "npc-chat" | "quest-play" | "hybrid-room"
export type PlaceType =
  | "tavern"
  | "cafe"
  | "milk-tea-shop"
  | "restaurant"
  | "convenience-store"
  | "bookstore"
  | "school"
  | "hospital"
  | "home"

export type RoleplayClaimStatus = "pending" | "approved" | "rejected" | "revoked"

export type RoleplayClaim = {
  id: string
  character_id: string
  player_id: string
  player_name?: string
  status: RoleplayClaimStatus | string
  requested_at?: string
  decided_at?: string
  note?: string
}

export type HomeMemberType = "conversational_character" | "silent_member" | "display_object"
export type HomeMemberSpeechMode = "character" | "silent" | "display"

export type HomeMember = {
  id: string
  home_id?: string
  name: string
  display_name?: string
  member_type: HomeMemberType | string
  speech_mode: HomeMemberSpeechMode | string
  description?: string
  avatar?: string
  character_id?: string
  created_at?: string
}

export type PlaceRelationshipStatus = "pending" | "approved" | "rejected" | "revoked"
export type PlaceRelationshipType =
  | "school_enrollment"
  | "care_link"
  | "membership"
  | "work_affiliation"
  | "story_link"

export type PlaceRelationship = {
  id: string
  relation_type: PlaceRelationshipType | string
  source_tavern_id: string
  source_member_id: string
  target_tavern_id: string
  status: PlaceRelationshipStatus | string
  display_name?: string
  visibility?: string
  source_role?: string
  target_role?: string
  requested_by?: string
  decided_by?: string
  created_at?: string
  decided_at?: string
  note?: string
}

export type SchoolMemberSummary = {
  relationship_id: string
  home_tavern_id: string
  member_id: string
  display_name: string
  member_type: HomeMemberType | string
  speech_mode?: HomeMemberSpeechMode | string
  avatar?: string
}

export type RelationshipNodeType = "tavern" | "character"
export type RelationshipBehaviorType = "friendly" | "allied" | "neutral" | "rival" | "hostile"
export type RelationshipStrengthPreset = "weak" | "normal" | "strong"
export type RelationshipGovernanceMode = "manual" | "assisted" | "delegated_ai" | "system_ai"
export type RelationshipEdgeStatus = "pending" | "confirmed" | "rejected" | "disabled"

export type RelationshipEdge = {
  id: string
  source_owner_id?: string
  source_tavern_id: string
  source_node_type: RelationshipNodeType | string
  source_node_id: string
  target_owner_id?: string
  target_tavern_id: string
  target_node_type: RelationshipNodeType | string
  target_node_id: string
  behavior_type: RelationshipBehaviorType | string
  display_name?: string
  description?: string
  strength_preset: RelationshipStrengthPreset | string
  status: RelationshipEdgeStatus | string
  governance_mode: RelationshipGovernanceMode | string
  confirmed_by?: string
  confirmed_by_type?: string
  perspective_scope?: string
  created_at?: string
  updated_at?: string
  metadata?: Record<string, unknown>
}

// Time context types
export type OperatingHoursMode = "always_open" | "scheduled"

export type OperatingHours =
  | { mode: "always_open" }
  | {
      mode: "scheduled"
      open_at: string // "HH:MM" format
      close_at: string // "HH:MM" format, can be > 24 for next-day (e.g., "26:00" = 2:00 next day)
      enabled_days: number[] // 0=Monday, 6=Sunday
    }

export type TavernTimeStatus = {
  timezone: string // IANA timezone e.g., "Asia/Shanghai"
  local_time_display: string // e.g., "22:47"
  is_open: boolean
  local_date?: string // e.g., "2026-04-27"
  local_season?: string // e.g., "春季"
  local_day_of_week?: string // e.g., "周一"
  local_hour?: number
}

export type Tavern = {
  id: string
  name: string
  description?: string
  lat: number
  lon: number
  address?: string
  access?: string
  status?: string
  owner_id?: string
  scene_prompt?: string
  roleplay_mode?: RoleplayMode | string
  layout_style?: TavernLayoutStyle | string
  place_type?: PlaceType | string
  special_type?: string
  character_claims?: RoleplayClaim[]
  visit_count?: number
  characters?: TavernCharacter[]
  world_info?: unknown[]
  gameplay_definitions?: unknown[]
  skill_packs?: SkillPackSetting[]
  home_members?: HomeMember[]
  place_relationships?: PlaceRelationship[]
  school_members?: SchoolMemberSummary[]
  pending_school_enrollments?: PlaceRelationship[]
  target_place_relationships?: PlaceRelationship[]
  pending_place_relationships?: PlaceRelationship[]
  // Time system fields
  timezone?: string
  operating_hours?: OperatingHours
  // Computed time context (returned by API)
  time_status?: TavernTimeStatus
  is_open?: boolean
  local_time_display?: string
  llm_config?: Record<string, unknown>
  visitor_state?: VisitorStatePayload | null
}

export type TavernListResponse = {
  taverns: Tavern[]
  count: number
  total?: number | null
  limit?: number | null
  offset?: number
  has_more?: boolean
}

export type PlatformStats = {
  coordinates: number
  characters: number
  visits: number
  encounters?: number
  chat_messages?: number
  open: number
}

export type PlatformStatsResponse = {
  stats: PlatformStats
  updated_at?: string
}

export type PlatformRecentMemory = {
  id: string
  content: string
  title?: string
  source: string
  tavern_id: string
  character_id?: string
  character_name?: string
  timestamp?: string
}

export type PlatformRecentMemoriesResponse = {
  memories: PlatformRecentMemory[]
  count: number
  limit?: number
  updated_at?: string
}

export type ClueHuntNodePayload = {
  id: string
  tavern_id?: string
  tavern_name?: string
  lat?: number
  lon?: number
  address?: string
  clue?: string
  hint?: string
  unlocked_summary?: string
  to?: string
  locked?: boolean
  answer_configured?: boolean
}

export type ClueHuntRoutePayload = {
  id: string
  owner_id?: string
  title: string
  description?: string
  status?: string
  reward_text?: string
  reward_coin_amount?: number
  node_count?: number
  nodes?: ClueHuntNodePayload[]
  first_node?: ClueHuntNodePayload | null
}

export type ClueHuntSessionPayload = {
  id: string
  route_id: string
  visitor_id: string
  status: "active" | "completed" | string
  current_index: number
  solved_node_ids: string[]
  visible_nodes: ClueHuntNodePayload[]
  current_node?: ClueHuntNodePayload | null
  node_count: number
  completed_at?: string
  reward_claimed?: boolean
  reward_claimed_at?: string
}

export type ClueHuntRewardPayload = {
  source: string
  text: string
  coin_amount: number
  balance: number
  scope: string
  tavern_id: string
}

export type TavernSharePayload = {
  tavern_id: string
  title: string
  description: string
  short_description: string
  cover: string
  location: {
    lat: number
    lon: number
    address: string
  }
  status: string
  access: string
  tags: string[]
  characters: Array<{
    id: string
    name: string
    avatar: string | null
  }>
  character_count: number
  share_url: string
  share_title: string
  share_text: string
}

export type RoleplayState = {
  tavern_id: string
  roleplay_mode: RoleplayMode | string
  claims: RoleplayClaim[]
  characters: Pick<TavernCharacter, "id" | "name" | "avatar">[]
  ok?: boolean
  claim?: RoleplayClaim
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
  conflicts?: ConflictReport[]
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

export type ConflictReport = {
  card_id: string
  card_title: string
  reason: string
  severity: "warning" | "error" | string
}

export type VisitorRelationshipPayload = {
  strength?: number
  stage?: string
  [key: string]: unknown
}

export type AffinityStage =
  | "stranger"
  | "acquaintance"
  | "familiar"
  | "friend"
  | "close_friend"
  | "best_friend"

export type AffinityStageDefinition = {
  stage: AffinityStage | string
  name_zh: string
  name_en: string
  strength_min: number
  strength_max: number
  greeting_style: string
  description?: string
}

export type AffinityResult = {
  strength: number
  previous_stage: AffinityStage | string
  new_stage: AffinityStage | string
  stage_label_zh?: string
  stage_changed?: boolean
  greeting_style?: string
  unlocked_topics?: string[]
  milestone_triggered?: string | null
}

export type VisitorStatePayload = {
  visitor_id?: string
  tavern_id?: string
  gender?: Gender | string
  visit_count?: number
  first_visit?: string | null
  last_visit?: string | null
  relationship?: VisitorRelationshipPayload | null
  [key: string]: unknown
}

export type ChatResponseMode = {
  kind:
    | "owner_llm"
    | "system_public_welfare_llm"
    | "llm_not_configured"
    | "llm_unavailable"
    | "unavailable"
    | string
  label: string
  message?: string
  requires_owner_llm?: boolean
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
  response_mode?: ChatResponseMode
  tavern_status?: string
  visitor_state?: VisitorStatePayload | null
  affinity?: AffinityResult | null
  created_memories?: unknown[]
  state_card_candidates?: StateCard[]
  conflicts?: ConflictReport[]
}

export type LLMConfigTestResponse = {
  ok: boolean
  message: string
  model?: string
  preview?: string
}

export type GroupChatConfig = {
  strategy?: string
  max_responses_per_turn?: number
  response_cooldown_seconds?: number
  require_name_prefix?: boolean
}

export type GroupChatCharacter = Pick<TavernCharacter, "id" | "name" | "avatar" | "talkativeness">

export type GroupChatConfigResponse = {
  tavern_id: string
  group_chat_enabled: boolean
  group_chat_config: GroupChatConfig
  characters: GroupChatCharacter[]
  character_count?: number
  ok?: boolean
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
  output_rules?: Record<string, unknown>
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
  affinity?: AffinityResult | null
  created_memories?: unknown[]
  state_card_candidates?: StateCard[]
  conflicts?: ConflictReport[]
}

export type VoiceConfig = {
  enabled: boolean
  tts_provider: string
  tts_voice?: string
  tts_model?: string
  tts_speed?: number
  tts_language?: string
  stt_provider: string
  stt_model?: string
  auto_play?: boolean
}

export type VoiceGreetingPreviewResponse = {
  ok: boolean
  tavern_id: string
  tavern_name?: string
  character_id: string
  character_name: string
  preview_only: boolean
  applied: boolean
  audio_generated: boolean
  tts_ready: boolean
  greeting: {
    text: string
    source: string
    greeting_index: number
  }
  voice: {
    enabled: boolean
    tts_provider: string
    tts_voice?: string
    tts_model?: string
    tts_speed?: number
    tts_language?: string
    auto_play?: boolean
  }
  tts_request: {
    text: string
    character_id: string
  }
  notes: string[]
}

export type VisualSouvenirPreviewResponse = {
  ok: boolean
  tavern_id: string
  tavern_name?: string
  visitor_id: string
  preview_only: boolean
  applied: boolean
  image_generated: boolean
  requires_confirmation: boolean
  souvenir: {
    prompt: string
    negative_prompt: string
    source_summary: string
    style: string
  }
  privacy_notes: string[]
  next_action: string
}

export type MemoryAtom = {
  id: string
  tavern_id: string
  scope: string
  dimension: string
  horizon: string
  subject: string
  content: string
  importance: number
  confidence: number
  source_message_ids: string[]
  created_at: string
  updated_at: string
  pinned: boolean
  visibility: string
  visitor_id: string
  character_id: string
  place_id: string
  created_by: string
  metadata: Record<string, unknown>
}

export type MemoryAtomListResponse = {
  tavern_id: string
  memory_atoms: MemoryAtom[]
  count: number
  filters: Record<string, string>
}

export type StateCardStatus = "pending" | "confirmed" | "rejected" | "superseded"
export type StateCardCategory = "character" | "task" | "resource" | "conflict" | "event_log"
export type StateCardScope = "visitor" | "tavern"

export type StateCard = {
  id: string
  tavern_id: string
  category: StateCardCategory | string
  status: StateCardStatus | string
  canon_scope: StateCardScope | string
  title: string
  summary: string
  visitor_id: string
  character_id: string
  source: string
  source_message_ids: string[]
  proposed_by: string
  confirmed_by: string
  created_at: string
  updated_at: string
  fixed_canon: boolean
  metadata: Record<string, unknown>
}

export type StateCardListResponse = {
  tavern_id: string
  state_cards: StateCard[]
  count: number
  filters: Record<string, string>
}

export type GmLayerPreviewRequest = {
  visitor_id?: string
  visitorId?: string
  character_id?: string
  characterId?: string
  user_message?: string
  message?: string
  assistant_message?: string
  response?: string
  source_message_ids?: string[]
  sourceMessageIds?: string[]
  source?: string
}

export type GmLayerPreviewResponse = {
  ok: boolean
  tavern_id: string
  tavern_name?: string
  visitor_id: string
  gm_mode: string
  preview_only: boolean
  applied: boolean
  candidates: StateCard[]
  summary: {
    total: number
    task: number
    resource: number
    conflict: number
    event_log: number
    [key: string]: number
  }
  notes: string[]
}

export type SkillPackDefinition = {
  id: string
  label: string
  description: string
  category?: string
  default_enabled?: boolean
  capabilities: string[]
  prompt_notes: string[]
  config_schema?: Record<string, unknown>
}

export type SkillPackSetting = {
  id: string
  enabled: boolean
  config?: Record<string, unknown>
}

export type SkillPacksResponse = {
  ok?: boolean
  tavern_id: string
  available_packs: SkillPackDefinition[]
  skill_packs: SkillPackSetting[]
  enabled_pack_ids: string[]
  owner_view?: boolean
}

export type WorldInfoTestResponse = {
  tavern_id: string
  message: string
  entry_count: number
  matched_count: number
  matches: Record<string, unknown>[]
  entries: Record<string, unknown>[]
  scanned_recent_count: number
  include_tavern_context: boolean
}

export type OutputRule = Record<string, unknown> & {
  id?: string
  name?: string
  enabled?: boolean
  kind?: string
  pattern?: string
  replacement?: string
}

export type PromptBlock = Record<string, unknown> & {
  id?: string
  name?: string
  enabled?: boolean
  type?: string
  order?: number
  template?: string
  token_budget?: number
}

export type OwnerDialoguePreviewDryRunResponse = {
  ok: boolean
  tavern_id: string
  character_id: string
  character_name: string
  visitor_id: string
  visitor_name: string
  message: string
  dry_run: boolean
  persisted: boolean
  model_requested: boolean
  model_called: boolean
  model_status: string
  model_error?: string
  degraded?: boolean
  assistant_message?: string
  token_estimate?: number
  history_written: boolean
  memory_written: boolean
  writeback_written: boolean
  visitor_state_written?: boolean
  messages: { role: string; content: string }[]
  message_count: number
  matched_world_info_count: number
  matched_world_info?: Record<string, unknown>[]
  prompt_summary?: Record<string, unknown>
  notes?: string[]
}

export type RuntimePreset = Record<string, unknown> & {
  id?: string
  name?: string
  built_in?: boolean
  llm_config?: Record<string, unknown>
  prompt_blocks?: PromptBlock[]
  output_rules?: OutputRule[]
  memory_policy?: Record<string, unknown>
}

export type RuntimePresetsResponse = {
  tavern_id: string
  active_preset_id: string
  presets: RuntimePreset[]
  custom_presets: RuntimePreset[]
  default_presets: RuntimePreset[]
  memory_policy: Record<string, unknown>
}

export type PresetImportPreviewItem = {
  id: string
  name: string
  category: string
  severity: "supported" | "warning" | "blocked" | string
  reason: string
  source?: string
  sample?: string
  enabled?: boolean
}

export type PresetImportPreviewResponse = {
  ok: boolean
  tavern_id?: string
  tavern_name?: string
  preview_only: boolean
  applied: boolean
  preset_name: string
  summary: {
    total_modules: number
    supported: number
    warning: number
    blocked: number
    runtime_parameters: number
  }
  supported: PresetImportPreviewItem[]
  warnings: PresetImportPreviewItem[]
  blocked: PresetImportPreviewItem[]
  runtime_parameters: Record<string, unknown>
  notes: string[]
}

export type PresetImportApplyDiff = {
  prompt_blocks: PromptBlock[]
  world_info: Record<string, unknown>[]
  characters: TavernCharacter[]
  runtime_presets: RuntimePreset[]
}

export type PresetImportApplyResponse = PresetImportPreviewResponse & {
  preview_only: false
  confirm_required: boolean
  selected_ids: string[]
  diff: PresetImportApplyDiff
  applied_counts: {
    prompt_blocks: number
    world_info: number
    characters: number
    runtime_presets: number
  }
  tavern?: Tavern
}

export type TavernVisitor = {
  visitor_id: string
  tavern_id: string
  gender?: Gender | string
  visit_count: number
  first_visit?: string | null
  last_visit?: string | null
  relationship?: VisitorRelationshipPayload | null
  visitor_name?: string
  message_count?: number
}

export type TavernPackage = Record<string, unknown> & {
  type: "fablemap_tavern_package" | string
  version: string
  tavern: Record<string, unknown>
  characters?: TavernCharacter[]
  world_info?: Record<string, unknown>[]
}

export type ExpressionCatalog = {
  expressions: string[]
  categories: Record<string, string[]>
  count: number
}

export type ExpressionInferResponse = {
  expression: string
  source: "llm" | "keyword" | string
  text: string
}

export type CharacterSpriteMapResponse = {
  character_id: string
  character_name: string
  sprites: Record<string, string>
  sprite_map: Record<string, string | null>
  default_expression: string
  default_url?: string | null
}

export type ParsedCharacterCard = {
  name: string
  description?: string
  personality?: string
  scenario?: string
  gender?: Gender | string
  system_prompt?: string
  first_mes?: string
  mes_example?: string
  alternate_greetings?: string[]
  tags?: string[]
  sprites?: Record<string, string>
  world_info?: Record<string, unknown>[]
  source_format?: string
}

export type CharacterDraftRequest = {
  style_tags?: string[]
  forbidden?: string[]
  tone?: string
}

export type CharacterDraftPreview = Pick<
  TavernCharacter,
  "name" | "description" | "personality" | "scenario" | "system_prompt" | "first_mes" | "mes_example" | "tags"
>

export type CharacterDraftResponse = {
  ok: boolean
  tavern_id: string
  status: "ai_draft" | string
  source: "owner_llm" | "local_template_fallback" | string
  source_label: string
  source_reason?: string
  draft: CharacterDraftPreview
  warnings: string[]
}

export type WorldInfoEntry = Record<string, unknown> & {
  id: string
  tavern_id?: string
  tavern_name?: string
  keys: string[]
  keys_secondary?: string[]
  content: string
  constant?: boolean
  selective?: boolean
  depth?: number
  order?: number
  insertion_order?: number
  probability?: number
  disable?: boolean
}

export type TokenizersResponse = {
  tokenizers: string[]
}

export type TokenCountResponse = {
  count: number
  backend: string
}

export type MemoryUtilityMessage = {
  role?: string
  content?: unknown
  [key: string]: unknown
}

export type MemoryTruncateResponse = {
  messages: MemoryUtilityMessage[]
  count: number
}

export type MemoryImportanceResponse = {
  scores: { index: number; importance: number }[]
}

function queryString(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  })
  const value = search.toString()
  return value ? `?${value}` : ""
}

export function listTaverns(filters: Record<string, string | number | undefined | null> = {}) {
  return readApiJson<TavernListResponse>(`/api/v1/taverns${queryString(filters)}`)
}

export function getPlatformStats() {
  return readApiJson<PlatformStatsResponse>("/api/v1/platform/stats")
}

export function getPlatformRecentMemories(filters: { limit?: number } = {}) {
  return readApiJson<PlatformRecentMemoriesResponse>(`/api/v1/platform/recent-memories${queryString(filters)}`)
}

export function listClueHuntRoutes(filters: { owner_id?: string } = {}, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ routes: ClueHuntRoutePayload[]; count: number }>(
    `/api/v1/clue-hunts/routes${queryString(filters)}`,
    { userId },
  )
}

export function createClueHuntRoute(data: Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; route: ClueHuntRoutePayload }>(
    "/api/v1/clue-hunts/routes",
    jsonInit("POST", data, userId),
  )
}

export function getClueHuntRoute(routeId: string) {
  return readApiJson<{ route: ClueHuntRoutePayload }>(`/api/v1/clue-hunts/routes/${encodeURIComponent(routeId)}`)
}

export function startClueHuntSession(routeId: string, data: { visitor_id?: string } = {}, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; route: ClueHuntRoutePayload; session: ClueHuntSessionPayload }>(
    `/api/v1/clue-hunts/routes/${encodeURIComponent(routeId)}/sessions`,
    jsonInit("POST", data, userId),
  )
}

export function submitClueHuntAnswer(
  routeId: string,
  sessionId: string,
  data: { answer: string; visitor_id?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    ok: boolean
    correct: boolean
    completed: boolean
    message?: string
    hint?: string
    session: ClueHuntSessionPayload
  }>(
    `/api/v1/clue-hunts/routes/${encodeURIComponent(routeId)}/sessions/${encodeURIComponent(sessionId)}/answer`,
    jsonInit("POST", data, userId),
  )
}

export function claimClueHuntReward(routeId: string, sessionId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; duplicate: boolean; reward: ClueHuntRewardPayload; session: ClueHuntSessionPayload }>(
    `/api/v1/clue-hunts/routes/${encodeURIComponent(routeId)}/sessions/${encodeURIComponent(sessionId)}/reward`,
    jsonInit("POST", {}, userId),
  )
}

export function getAffinityStages() {
  return readApiJson<{ stages: AffinityStageDefinition[]; count: number }>("/api/v1/affinity/stages")
}

export function createTavern(data: Partial<Tavern> & Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<Tavern>("/api/v1/taverns", jsonInit("POST", data, userId))
}

export type TavernDetailView = "entry"

export function getTavern(tavernId: string, userId = "", options: { view?: TavernDetailView } = {}) {
  return readApiJson<Tavern>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}${queryString({ view: options.view })}`,
    { userId },
  )
}

export function getTavernShare(tavernId: string, userId = "") {
  return readApiJson<TavernSharePayload>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/share`, { userId })
}

export function enterTavern(
  tavernId: string,
  password = "",
  userId = DEFAULT_VISITOR_ID,
  visitorGender: Gender | string = "",
) {
  return readApiJson<{ ok: boolean; first_mes?: string; visitor_state?: VisitorStatePayload | null }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/enter`,
    jsonInit("POST", { password, visitor_gender: visitorGender }, userId),
  )
}

export function getRoleplayState(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<RoleplayState>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/roleplay`, { userId })
}

export function saveRoleplayConfig(
  tavernId: string,
  data: { roleplay_mode: RoleplayMode | string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<RoleplayState>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/roleplay`,
    jsonInit("PUT", data, userId),
  )
}

export function requestRoleplayClaim(
  tavernId: string,
  data: { character_id: string; player_id?: string; player_name?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<RoleplayState>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/roleplay/claims`,
    jsonInit("POST", data, userId),
  )
}

export function decideRoleplayClaim(
  tavernId: string,
  claimId: string,
  data: { status: RoleplayClaimStatus | string; note?: string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<RoleplayState>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/roleplay/claims/${encodeURIComponent(claimId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function exportTavernPackage(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernPackage>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/package`, { userId })
}

export function importTavernPackage(
  data: {
    package?: TavernPackage
    lat?: number
    lon?: number
    name?: string
    address?: string
    access?: string
    tavern_id?: string
  } & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; tavern_id: string; tavern: Tavern; characters: number; world_info: number }>(
    "/api/v1/tavern-packages/import",
    jsonInit("POST", data, userId),
  )
}

export function listTavernVisitors(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ visitors: TavernVisitor[]; count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/visitors`,
    { userId },
  )
}

export function addCharacter(tavernId: string, data: Partial<TavernCharacter>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernCharacter>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters`,
    jsonInit("POST", data, userId),
  )
}

export function addHomeMember(tavernId: string, data: Partial<HomeMember>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; member: HomeMember; members: HomeMember[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/home-members`,
    jsonInit("POST", data, userId),
  )
}

export function createSchoolEnrollment(
  tavernId: string,
  data: { member_id: string; school_tavern_id: string; display_name?: string; note?: string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; relationship: PlaceRelationship }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationships/school-enrollments`,
    jsonInit("POST", data, userId),
  )
}

export function createPlaceRelationship(
  tavernId: string,
  data: {
    member_id: string
    target_tavern_id: string
    relation_type: PlaceRelationshipType | string
    display_name?: string
    source_role?: string
    target_role?: string
    note?: string
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; relationship: PlaceRelationship }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationships`,
    jsonInit("POST", data, userId),
  )
}

export function decidePlaceRelationship(
  tavernId: string,
  relationshipId: string,
  data: { status: PlaceRelationshipStatus | string; note?: string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; relationship: PlaceRelationship }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationships/${encodeURIComponent(relationshipId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function listRelationshipEdges(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ edges: RelationshipEdge[]; count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationship-edges`,
    { userId },
  )
}

export function createRelationshipEdge(
  tavernId: string,
  data: {
    source_tavern_id?: string
    source_node_type?: RelationshipNodeType | string
    source_node_id?: string
    target_tavern_id: string
    target_node_type?: RelationshipNodeType | string
    target_node_id?: string
    behavior_type: RelationshipBehaviorType | string
    display_name?: string
    description?: string
    strength_preset?: RelationshipStrengthPreset | string
    status?: RelationshipEdgeStatus | string
    governance_mode?: RelationshipGovernanceMode | string
    confirmed_by_type?: string
    metadata?: Record<string, unknown>
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; edge: RelationshipEdge }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationship-edges`,
    jsonInit("POST", data, userId),
  )
}

export function updateRelationshipEdge(
  tavernId: string,
  edgeId: string,
  data: {
    source_tavern_id?: string
    source_node_type?: RelationshipNodeType | string
    source_node_id?: string
    target_tavern_id?: string
    target_node_type?: RelationshipNodeType | string
    target_node_id?: string
    behavior_type?: RelationshipBehaviorType | string
    display_name?: string
    description?: string
    strength_preset?: RelationshipStrengthPreset | string
    status?: RelationshipEdgeStatus | string
    governance_mode?: RelationshipGovernanceMode | string
    confirmed_by_type?: string
    metadata?: Record<string, unknown>
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; edge: RelationshipEdge }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationship-edges/${encodeURIComponent(edgeId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function decideRelationshipEdge(
  tavernId: string,
  edgeId: string,
  data: { status: RelationshipEdgeStatus | string; note?: string; confirmed_by_type?: string; metadata?: Record<string, unknown> },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; edge: RelationshipEdge }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/relationship-edges/${encodeURIComponent(edgeId)}/decision`,
    jsonInit("POST", data, userId),
  )
}

export function listSchoolMembers(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ tavern_id: string; members: SchoolMemberSummary[]; count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/school-members`,
    { userId },
  )
}

export function generateCharacterDraft(
  tavernId: string,
  data: CharacterDraftRequest,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<CharacterDraftResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/ai-draft`,
    jsonInit("POST", data, userId),
  )
}

export function importCharacterCard(tavernId: string, card: Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernCharacter>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/import`,
    jsonInit("POST", card, userId),
  )
}

export function getExpressions() {
  return readApiJson<ExpressionCatalog>("/api/v1/expressions")
}

export function inferExpression(
  data: {
    text: string
    character_name?: string
    tavern_id?: string
    character_id?: string
  },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<ExpressionInferResponse>("/api/v1/expression/infer", jsonInit("POST", data, userId))
}

export function getCharacterSprites(tavernId: string, characterId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<CharacterSpriteMapResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`,
    { userId },
  )
}

export function saveCharacterSprites(
  tavernId: string,
  characterId: string,
  sprites: Record<string, string>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; character_id: string; sprites: Record<string, string> }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`,
    jsonInit("PUT", { sprites }, userId),
  )
}

export function parseCharacterCard(
  data: { json?: Record<string, unknown>; base64?: string } & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<ParsedCharacterCard>("/api/v1/characters/parse", jsonInit("POST", data, userId))
}

export function exportCharacterCard(
  data: { character?: ParsedCharacterCard | Record<string, unknown>; format?: string } & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<Record<string, unknown>>("/api/v1/characters/export", jsonInit("POST", data, userId))
}

export function getTavernChatHistory(
  tavernId: string,
  visitorId = DEFAULT_VISITOR_ID,
  characterId = "",
  userId = visitorId,
  limit = 50,
) {
  return readApiJson<{ messages: ChatMessage[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/chat${queryString({
      visitor_id: visitorId,
      character_id: characterId,
      limit,
    })}`,
    { userId },
  )
}

export function sendTavernChat(
  tavernId: string,
  data: {
    character_id: string
    message: string
    visitor_id: string
    visitor_name?: string
    visitor_gender?: Gender | string
    display_message?: string
    extra_context?: Array<Record<string, unknown>>
  },
) {
  return readApiJson<ChatResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/chat`,
    jsonInit("POST", data, data.visitor_id),
  )
}

export function testLlmConfig(data: Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<LLMConfigTestResponse>("/api/v1/llm/test-config", jsonInit("POST", data, userId))
}

export function testTavernLlm(tavernId: string, data: Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<LLMConfigTestResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/test-llm`,
    jsonInit("POST", data, userId),
  )
}

export function getGroupChatConfig(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<GroupChatConfigResponse>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat`, { userId })
}

export function saveGroupChatConfig(
  tavernId: string,
  data: {
    group_chat_enabled?: boolean
    group_chat_config?: GroupChatConfig
    character_talkativeness?: Record<string, number>
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<GroupChatConfigResponse & { ok: boolean }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat/config`,
    jsonInit("PUT", data, userId),
  )
}

export function sendGroupChat(
  tavernId: string,
  data: { message: string; visitor_id: string; visitor_name?: string; visitor_gender?: Gender | string; display_message?: string },
) {
  return readApiJson<GroupChatResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat`,
    jsonInit("POST", data, data.visitor_id),
  )
}

export function getGroupChatHistory(tavernId: string, visitorId = DEFAULT_VISITOR_ID, userId = visitorId, limit = 50) {
  return readApiJson<{ messages: GroupChatMessage[]; message_count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat/history${queryString({
      visitor_id: visitorId,
      limit,
    })}`,
    { userId },
  )
}

export function updateCharacterTalkativeness(
  tavernId: string,
  characterId: string,
  talkativeness: number,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<GroupChatConfigResponse & { ok: boolean }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/talkativeness`,
    jsonInit("PUT", { talkativeness }, userId),
  )
}

export type ChatSession = {
  tavern_id: string
  tavern_name: string
  visitor_id: string
  visitor_name: string
  character_id: string
  character_name: string
  message_count: number
  last_message: string
  last_role: string
  updated_at: string
}

export type ChatSessionListResponse = {
  chats: ChatSession[]
  count: number
}

export type ChatExportResponse = {
  messages?: ChatMessage[]
  text?: string
}

export type EpisodeExportOptions = {
  tavernId?: string
  visitorId?: string
  characterId?: string
  title?: string
  includePending?: boolean
  format?: "markdown" | "json" | string
  limit?: number
}

export type EpisodeExportResponse = {
  ok: boolean
  tavern_id: string
  tavern_name?: string
  visitor_id: string
  character_id: string
  format: string
  requested_format?: string
  persisted: boolean
  include_pending?: boolean
  episode: {
    title: string
    summary: string
    markdown: string
    messages: Array<{ id?: string; role: string; speaker: string; content: string; timestamp?: string }>
    state_cards: Array<{ id?: string; category: string; status: string; title: string; summary?: string }>
    message_count: number
    state_card_count: number
  }
}

export function listChatSessions(
  options: { tavernId?: string; characterId?: string; visitorId?: string } = {},
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<ChatSessionListResponse>(
    `/api/v1/taverns/${encodeURIComponent(options.tavernId || "")}/chat/sessions${queryString({
      character_id: options.characterId,
      visitor_id: options.visitorId,
    })}`,
    { userId },
  )
}

export function listGlobalChatSessions(
  options: { characterId?: string; visitorId?: string } = {},
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<ChatSessionListResponse>(
    `/api/v1/chat/sessions${queryString({
      character_id: options.characterId,
      visitor_id: options.visitorId,
    })}`,
    { userId },
  )
}

export function exportChatHistory(
  options: { tavernId?: string; characterId?: string; visitorId?: string; format?: string } = {},
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<ChatExportResponse>(
    `/api/v1/taverns/${encodeURIComponent(options.tavernId || "")}/chat/export`,
    jsonInit("POST", {
      character_id: options.characterId || "",
      visitor_id: options.visitorId || "",
      format: options.format || "json",
    }, userId),
  )
}

export function exportEpisode(options: EpisodeExportOptions = {}, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<EpisodeExportResponse>(
    `/api/v1/taverns/${encodeURIComponent(options.tavernId || "")}/episodes/export`,
    jsonInit("POST", {
      visitor_id: options.visitorId || "",
      character_id: options.characterId || "",
      title: options.title || "",
      include_pending: Boolean(options.includePending),
      format: options.format || "markdown",
      limit: options.limit || 200,
    }, userId),
  )
}

export function searchChatHistory(
  options: { tavernId: string; characterId?: string; visitorId?: string; query?: string; limit?: number },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ results: { index: number; message: ChatMessage }[]; count: number; limit: number; truncated: boolean }>(
    `/api/v1/taverns/${encodeURIComponent(options.tavernId)}/chat/search`,
    jsonInit("POST", {
      character_id: options.characterId || "",
      visitor_id: options.visitorId || "",
      query: options.query || "",
      limit: options.limit || 20,
    }, userId),
  )
}

export function getVoiceConfig(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ voice_config: VoiceConfig }>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`, { userId })
}

export function saveVoiceConfig(tavernId: string, data: Partial<VoiceConfig>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; voice_config: VoiceConfig }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`,
    jsonInit("PUT", data, userId),
  )
}

export function previewVoiceGreeting(
  tavernId: string,
  data: { character_id?: string; characterId?: string; greeting_index?: number; greetingIndex?: number },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<VoiceGreetingPreviewResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/voice-greeting/preview`,
    jsonInit("POST", {
      character_id: data.character_id || data.characterId || "",
      greeting_index: data.greeting_index ?? data.greetingIndex ?? 0,
    }, userId),
  )
}

export function previewVisualSouvenir(
  tavernId: string,
  data: {
    visitor_id?: string
    visitorId?: string
    character_id?: string
    characterId?: string
    user_message?: string
    userMessage?: string
    assistant_message?: string
    assistantMessage?: string
    style?: string
  },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<VisualSouvenirPreviewResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/visual-souvenir/preview`,
    jsonInit("POST", {
      visitor_id: data.visitor_id || data.visitorId || "",
      character_id: data.character_id || data.characterId || "",
      user_message: data.user_message || data.userMessage || "",
      assistant_message: data.assistant_message || data.assistantMessage || "",
      style: data.style || "",
    }, userId),
  )
}

export function synthesizeVoice(tavernId: string, data: { text: string; character_id?: string }, userId = DEFAULT_VISITOR_ID) {
  return readApiBlob(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/tts`,
    jsonInit("POST", data, userId),
  )
}

export function listMemoryAtoms(
  tavernId: string,
  filters: Record<string, string | number | undefined | null> = {},
  userId = "",
) {
  return readApiJson<MemoryAtomListResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms${queryString(filters)}`,
    { userId },
  )
}

export function createMemoryAtom(tavernId: string, data: Partial<MemoryAtom>, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; memory_atom: MemoryAtom }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms`,
    jsonInit("POST", data, userId),
  )
}

export function updateMemoryAtom(
  tavernId: string,
  memoryId: string,
  data: Partial<MemoryAtom>,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ ok: boolean; tavern_id: string; memory_atom: MemoryAtom }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms/${encodeURIComponent(memoryId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function deleteMemoryAtom(tavernId: string, memoryId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; memory_id: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms/${encodeURIComponent(memoryId)}`,
    jsonInit("DELETE", undefined, userId),
  )
}

export function listStateCards(
  tavernId: string,
  filters: Record<string, string | number | undefined | null> = {},
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<StateCardListResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/state-cards${queryString(filters)}`,
    { userId },
  )
}

export function createStateCard(
  tavernId: string,
  data: Partial<StateCard>,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ ok: boolean; tavern_id: string; state_card: StateCard }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/state-cards`,
    jsonInit("POST", data, userId),
  )
}

export function decideStateCard(
  tavernId: string,
  cardId: string,
  data: { status: StateCardStatus | string; note?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ ok: boolean; tavern_id: string; state_card: StateCard }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/state-cards/${encodeURIComponent(cardId)}/decision`,
    jsonInit("PUT", data, userId),
  )
}

export function previewGmLayer(
  tavernId: string,
  data: GmLayerPreviewRequest,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<GmLayerPreviewResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gm-layer/preview`,
    jsonInit("POST", data, userId),
  )
}

export function listSkillPacks(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<SkillPacksResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/skill-packs`,
    { userId },
  )
}

export function saveSkillPacks(
  tavernId: string,
  skillPacks: SkillPackSetting[],
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<SkillPacksResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/skill-packs`,
    jsonInit("PUT", { skill_packs: skillPacks }, userId),
  )
}

export function togglePinMemory(
  tavernId: string,
  memoryId: string,
  pinned: boolean,
  userId = DEFAULT_VISITOR_ID,
) {
  return updateMemoryAtom(tavernId, memoryId, { pinned }, userId)
}

export interface MemoryFeedbackRequest {
  correct: boolean | null
  content?: string | null
}

export interface MemoryFeedbackResponse {
  ok: boolean
  tavern_id: string
  memory_atom: MemoryAtom
  feedback: {
    status: 'reinforced' | 'corrected' | 'flagged_wrong'
    correct: boolean
  }
}

export function feedbackMemoryAtom(
  tavernId: string,
  memoryId: string,
  feedback: MemoryFeedbackRequest,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<MemoryFeedbackResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms/${encodeURIComponent(memoryId)}/feedback`,
    jsonInit('POST', feedback, userId),
  )
}

export function listMemories(
  tavernId: string,
  filters: Record<string, string | number | boolean | undefined | null> = {},
  userId = "",
) {
  return readApiJson<{
    memories: MemoryAtom[]
    count: number
    total: number
    offset: number
    limit: number
  }>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/memories${queryString(filters)}`, { userId })
}

export function listWorldInfo(tavernId = "", userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ world_info: WorldInfoEntry[]; count: number }>(
    `/api/v1/worldinfo${queryString({ tavern_id: tavernId })}`,
    { userId },
  )
}

export function createWorldInfo(data: Partial<WorldInfoEntry> & { tavern_id: string }, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; entry: WorldInfoEntry }>(
    "/api/v1/worldinfo",
    jsonInit("POST", data, userId),
  )
}

export function updateWorldInfo(
  entryId: string,
  data: Partial<WorldInfoEntry> & { tavern_id: string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; entry: WorldInfoEntry }>(
    `/api/v1/worldinfo/${encodeURIComponent(entryId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function deleteWorldInfo(entryId: string, tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; entry_id: string; tavern_id: string }>(
    `/api/v1/worldinfo/${encodeURIComponent(entryId)}`,
    jsonInit("DELETE", { tavern_id: tavernId }, userId),
  )
}

export function testWorldInfoGlobal(
  data: {
    tavern_id: string
    text?: string
    message?: string
    recent_messages?: unknown[]
    include_tavern_context?: boolean
    world_info?: Record<string, unknown>[]
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<WorldInfoTestResponse>("/api/v1/worldinfo/test", jsonInit("POST", data, userId))
}

export function listTokenizers() {
  return readApiJson<TokenizersResponse>("/api/v1/tokenizers")
}

export function countTokens(data: { text?: string; backend?: string }) {
  return readApiJson<TokenCountResponse>("/api/v1/tokenizers/count", jsonInit("POST", data))
}

export function countMessageTokens(data: { messages?: MemoryUtilityMessage[]; backend?: string }) {
  return readApiJson<TokenCountResponse>("/api/v1/tokenizers/count_messages", jsonInit("POST", data))
}

export function summarizeMemory(data: {
  messages?: MemoryUtilityMessage[]
  strategy?: string
  previous_summary?: string
}) {
  return readApiJson<{ summary: string }>("/api/v1/memory/summarize", jsonInit("POST", data))
}

export function truncateMemory(data: { messages?: MemoryUtilityMessage[]; max_tokens?: number }) {
  return readApiJson<MemoryTruncateResponse>("/api/v1/memory/truncate", jsonInit("POST", data))
}

export function scoreMemoryImportance(data: { messages?: MemoryUtilityMessage[] }) {
  return readApiJson<MemoryImportanceResponse>("/api/v1/memory/importance", jsonInit("POST", data))
}

export function testWorldInfo(
  tavernId: string,
  data: {
    message?: string
    recent_messages?: unknown[]
    include_tavern_context?: boolean
    world_info?: Record<string, unknown>[]
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<WorldInfoTestResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/world-info/test`,
    jsonInit("POST", data, userId),
  )
}

export function getOutputRules(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ tavern_id: string; rules: OutputRule[]; default_rules: OutputRule[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules`,
    { userId },
  )
}

export function saveOutputRules(tavernId: string, rules: OutputRule[], userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; rules: OutputRule[]; tavern: Tavern }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules`,
    jsonInit("PUT", { rules }, userId),
  )
}

export function testOutputRules(
  tavernId: string,
  data: { text?: string; rules?: OutputRule[]; output_rules?: OutputRule[] },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<Record<string, unknown> & { tavern_id: string; text: string; changed: boolean }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules/test`,
    jsonInit("POST", data, userId),
  )
}

export function getPromptBlocks(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ tavern_id: string; blocks: PromptBlock[]; default_blocks: PromptBlock[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks`,
    { userId },
  )
}

export function savePromptBlocks(tavernId: string, blocks: PromptBlock[], userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; blocks: PromptBlock[]; tavern: Tavern }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks`,
    jsonInit("PUT", { blocks }, userId),
  )
}

export function previewPromptBlocks(
  tavernId: string,
  data: {
    blocks?: PromptBlock[]
    prompt_blocks?: PromptBlock[]
    character_id?: string
    message?: string
    visitor_name?: string
    visitor_visit_count?: number
    visitor_relationship_stage?: string
    visitor_relationship_strength?: number
    visitor_message_count?: number
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{
    tavern_id: string
    character_id: string
    character_name: string
    blocks: PromptBlock[]
    messages: { role: string; content: string }[]
    message_count: number
  }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks/preview`,
    jsonInit("POST", data, userId),
  )
}

export function previewOwnerDialogueDryRun(
  tavernId: string,
  data: {
    character_id?: string
    message?: string
    visitor_id?: string
    visitor_name?: string
    call_model?: boolean
  },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<OwnerDialoguePreviewDryRunResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/dialogue-preview/dry-run`,
    jsonInit("POST", data, userId),
  )
}

export function getRuntimePresets(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<RuntimePresetsResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets`,
    { userId },
  )
}

export function saveRuntimePresets(
  tavernId: string,
  data: { presets?: RuntimePreset[]; runtime_presets?: RuntimePreset[]; active_preset_id?: string },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<RuntimePresetsResponse & { ok: boolean; tavern: Tavern }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets`,
    jsonInit("PUT", data, userId),
  )
}

export function applyRuntimePreset(
  tavernId: string,
  data: { preset_id?: string; id?: string; preset?: RuntimePreset },
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<{ ok: boolean; tavern_id: string; active_preset_id: string; preset: RuntimePreset; tavern: Tavern }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets/apply`,
    jsonInit("POST", data, userId),
  )
}

export function previewPresetImport(
  tavernId: string,
  data: { preset?: Record<string, unknown> | string; preset_json?: string; json?: string; content?: string } & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<PresetImportPreviewResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/preset-import/preview`,
    jsonInit("POST", data, userId),
  )
}

export function applyPresetImport(
  tavernId: string,
  data: {
    preset?: Record<string, unknown> | string
    preset_json?: string
    content?: string
    selected_ids?: string[]
    target_map?: Record<string, "prompt_blocks" | "world_info" | "characters" | string>
    include_runtime_parameters?: boolean
    confirm?: boolean
  } & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<PresetImportApplyResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/preset-import/apply`,
    jsonInit("POST", data, userId),
  )
}

export function abandonGameplaySession(tavernId: string, sessionId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; session: Record<string, unknown> }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/abandon`,
    jsonInit("POST", {}, userId),
  )
}

export function updateTavern(tavernId: string, data: Partial<Tavern> & Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<Tavern>(`/api/v1/taverns/${encodeURIComponent(tavernId)}`, jsonInit("PUT", data, userId))
}

export function deleteTavern(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}`,
    jsonInit("DELETE", undefined, userId),
  )
}

export function listCharacters(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ characters: TavernCharacter[]; count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters`,
    { userId },
  )
}

export function updateCharacter(
  tavernId: string,
  characterId: string,
  data: Partial<TavernCharacter> & Record<string, unknown>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<TavernCharacter>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}`,
    jsonInit("PUT", data, userId),
  )
}

export function deleteCharacter(tavernId: string, characterId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; character_id: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}`,
    jsonInit("DELETE", undefined, userId),
  )
}

export function getGameplays(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ gameplay_definitions: Record<string, unknown>[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplays`,
    { userId },
  )
}

export function saveGameplays(tavernId: string, gameplays: Record<string, unknown>[], userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; gameplay_definitions: Record<string, unknown>[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplays`,
    jsonInit("PUT", { gameplays }, userId),
  )
}

export function startGameplaySession(
  tavernId: string,
  data: {
    definition_id?: string
    name?: string
    visitor_id?: string
    visitor_name?: string
  },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    session_id: string
    state: string
    definition_id: string
    definition_name: string
  }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions`,
    jsonInit("POST", data, userId),
  )
}

export function advanceGameplaySession(
  tavernId: string,
  sessionId: string,
  data: { choice_id?: string; message?: string } = {},
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{
    ok: boolean
    session_id: string
    state: string
    events: Record<string, unknown>[]
    updated_tavern: Tavern
  }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/advance`,
    jsonInit("POST", data, userId),
  )
}

export function listGameplaySessions(
  tavernId: string,
  options: { state?: string; visitor_id?: string } = {},
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ sessions: Record<string, unknown>[]; count: number }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions${queryString({
      state: options.state,
      visitor_id: options.visitor_id,
    })}`,
    { userId },
  )
}

export function transcribeVoice(tavernId: string, audioBlob: Blob, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ text: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/stt`,
    {
      method: "POST",
      body: audioBlob,
      headers: { "Content-Type": "audio/webm" },
    },
  )
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "未知错误")
}

export type TokenUsage = {
  total: number
  history?: { date: string; tokens: number }[]
}

export type NpcRanking = {
  character_id: string
  character_name: string
  message_count: number
  last_interaction?: string
}

export type PeakDay = {
  date: string
  visit_count: number
}

export type TavernMetricsResponse = {
  tavern_id: string
  token_usage: TokenUsage | number
  total_visits: number
  unique_visitors: number
  total_messages: number
  npc_rankings: NpcRanking[]
  peak_hours: number[]
  peak_days: PeakDay[]
}

export function getTavernMetrics(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernMetricsResponse>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/metrics`, { userId })
}

// ─────────────────────────────────────────
// Guest Message Board
// ─────────────────────────────────────────

export type TavernMessage = {
  id: string
  tavern_id: string
  visitor_id: string
  visitor_nickname: string
  content: string
  created_at: string
  is_pinned: boolean
  parent_id: string | null
}

export type TavernMessageListResponse = {
  messages: TavernMessage[]
  count: number
  pinned_count: number
}

export function listTavernMessages(
  tavernId: string,
  options: { limit?: number; offset?: number } = {},
  userId = DEFAULT_VISITOR_ID,
) {
  const params = new URLSearchParams()
  if (options.limit) params.set("limit", String(options.limit))
  if (options.offset) params.set("offset", String(options.offset))
  const query = params.toString() ? `?${params.toString()}` : ""

  return readApiJson<TavernMessageListResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/messages${query}`,
    { userId },
  )
}

export function createTavernMessage(
  tavernId: string,
  data: { content: string; visitor_nickname?: string; parent_id?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<TavernMessage>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/messages`,
    jsonInit("POST", data, userId),
  )
}

export function deleteTavernMessage(tavernId: string, messageId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; message_id: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/messages/${encodeURIComponent(messageId)}`,
    { method: "DELETE", ...(userId ? { userId } : {}) },
  )
}

export function togglePinTavernMessage(tavernId: string, messageId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernMessage>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/messages/${encodeURIComponent(messageId)}/pin`,
    { method: "PUT", userId },
  )
}

export function replyTavernMessage(
  tavernId: string,
  messageId: string,
  data: { content: string; visitor_nickname?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<TavernMessage>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/messages/${encodeURIComponent(messageId)}/reply`,
    jsonInit("POST", data, userId),
  )
}

export type TavernVisitorNote = {
  id: string
  tavern_id: string
  visitor_id: string
  visitor_nickname: string
  content: string
  created_at: string
  visibility: "owner_only" | string
}

export type TavernVisitorNoteListResponse = {
  notes: TavernVisitorNote[]
  count: number
}

export function createVisitorNote(
  tavernId: string,
  data: { content: string; visitor_nickname?: string },
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<{ ok: boolean; note: TavernVisitorNote }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/visitor-notes`,
    jsonInit("POST", data, userId),
  )
}

export function listVisitorNotes(
  tavernId: string,
  options: { limit?: number; offset?: number } = {},
  userId = DEFAULT_OWNER_ID,
) {
  const params = new URLSearchParams()
  if (options.limit) params.set("limit", String(options.limit))
  if (options.offset) params.set("offset", String(options.offset))
  const query = params.toString() ? `?${params.toString()}` : ""
  return readApiJson<TavernVisitorNoteListResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/visitor-notes${query}`,
    { userId },
  )
}

export function deleteVisitorNote(tavernId: string, noteId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; note_id: string }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/visitor-notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE", userId },
  )
}

// ─────────────────────────────────────────
// Neighborhood Rumors
// ─────────────────────────────────────────

export type NeighborhoodRumor = {
  id: string
  source_tavern_id: string
  target_tavern_id: string
  target_tavern_name: string
  character_id: string
  character_name: string
  rumor_text: string
  trigger_type: string
  trigger_keywords: string[]
  weight: number
  created_at: string
  expires_at: string | null
  view_count: number
  click_count: number
}

export type RumorListResponse = {
  rumors: NeighborhoodRumor[]
  count: number
}

export function listRumors(options: {
  source_tavern_id?: string
  limit?: number
  include_expired?: boolean
}) {
  const params = new URLSearchParams()
  if (options.source_tavern_id) params.set("source_tavern_id", options.source_tavern_id)
  if (options.limit) params.set("limit", String(options.limit))
  if (options.include_expired) params.set("include_expired", "true")
  const query = params.toString() ? `?${params.toString()}` : ""

  return readApiJson<RumorListResponse>(`/api/v1/rumors${query}`)
}

export function generateRumor(data: {
  source_tavern_id: string
  target_tavern_id: string
  target_tavern_name: string
  character_id: string
  character_name: string
  trigger_type?: string
  trigger_keywords?: string[]
}) {
  return readApiJson<{ ok: boolean; rumor: NeighborhoodRumor }>(
    "/api/v1/rumors/generate",
    jsonInit("POST", data, DEFAULT_OWNER_ID),
  )
}

export function recordRumorView(rumorId: string) {
  return readApiJson<{ ok: boolean; view_count: number }>(
    `/api/v1/rumors/${encodeURIComponent(rumorId)}/view`,
    { method: "POST" },
  )
}

export function recordRumorClick(rumorId: string) {
  return readApiJson<{ ok: boolean; click_count: number }>(
    `/api/v1/rumors/${encodeURIComponent(rumorId)}/click`,
    { method: "POST" },
  )
}

// ─────────────────────────────────────────
// Owner Default LLM Config
// ─────────────────────────────────────────

export type OwnerDefaultLLMSafe = {
  configured: boolean
  llm_config: {
    backend: string
    model: string
    api_key_configured: boolean
    base_url: string
    temperature: number
    max_tokens: number
    top_p: number
  } | null
}

export type OwnerDefaultLLMSave = {
  backend?: string
  model?: string
  api_key?: string
  base_url?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
}

export function getOwnerDefaultLLM(userId = DEFAULT_OWNER_ID) {
  return readApiJson<OwnerDefaultLLMSafe>("/api/v1/owners/me/default-llm", { userId })
}

export function saveOwnerDefaultLLM(data: OwnerDefaultLLMSave, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; owner_id: string; configured: boolean }>(
    "/api/v1/owners/me/default-llm",
    jsonInit("PUT", data, userId),
  )
}

// ─────────────────────────────────────────
// Tavern Draft Generation
// ─────────────────────────────────────────

export type TavernDraftRequest = {
  lat: number
  lon: number
  address?: string
  place_type?: string
  style_tags?: string[]
  forbidden?: string[]
  tone?: string
}

export type TavernDraftCharacter = {
  name: string
  description?: string
  personality?: string
  scenario?: string
  system_prompt?: string
  first_mes?: string
  mes_example?: string
  tags?: string[]
  hobbies?: string[]
}

export type TavernDraft = {
  name: string
  description: string
  scene_prompt: string
  character: TavernDraftCharacter
}

export type TavernDraftResponse = {
  ok: boolean
  draft: TavernDraft
}

export function generateTavernDraft(data: TavernDraftRequest, userId = DEFAULT_OWNER_ID) {
  return readApiJson<TavernDraftResponse>(
    "/api/v1/owners/me/tavern-drafts/generate",
    jsonInit("POST", data, userId),
  )
}

// ─────────────────────────────────────────
// Home System
// ─────────────────────────────────────────

export type HomeVisitSettings = {
  public: boolean
  approval_required: boolean
  friends_only: boolean
  max_daily_visitors: number
}

export type HomeStatus = "open" | "closed" | "hidden"

export type Home = {
  id: string
  owner_id: string
  name: string
  description: string
  avatar: string
  cover_image: string
  theme: string
  visit_settings: HomeVisitSettings
  members: HomeMember[]
  status: HomeStatus | string
  created_at: string
  updated_at: string
}

export type HomeListResponse = {
  homes: Home[]
  count: number
}

export type HomeVisitResponse = {
  home_id: string
  owner_id: string
  name: string
  status: string
  can_enter: boolean
  message: string | null
}

export type HomeChatResponse = {
  member_id: string
  message: string
  is_silent: boolean
}

export type HomeMemberWriteData = {
  id?: string
  name?: string
  display_name?: string
  member_type?: HomeMemberType | string
  speech_mode?: HomeMemberSpeechMode | string
  description?: string
  avatar?: string
  is_speaking?: boolean
  is_living?: boolean
  nonliving_note?: string
  character_id?: string
  metadata?: Record<string, unknown>
}

export type HomeCreateData = {
  name?: string
  description?: string
  avatar?: string
  cover_image?: string
  theme?: string
  visit_settings?: Partial<HomeVisitSettings>
  members?: HomeMemberWriteData[]
}

export type HomeUpdateData = {
  name?: string
  description?: string
  avatar?: string
  cover_image?: string
  theme?: string
  status?: HomeStatus | string
  visit_settings?: Partial<HomeVisitSettings>
}

export function getMyHome(userId = "") {
  return readApiJson<Home | null>("/api/v1/homes/me", { userId })
}

export function createHome(data: HomeCreateData, userId = DEFAULT_OWNER_ID) {
  return readApiJson<Home>("/api/v1/homes", jsonInit("POST", data, userId))
}

export function getHome(homeId: string, userId = "") {
  return readApiJson<Home | null>(`/api/v1/homes/${encodeURIComponent(homeId)}`, { userId })
}

export function updateHome(homeId: string, data: HomeUpdateData, userId = DEFAULT_OWNER_ID) {
  return readApiJson<Home | null>(`/api/v1/homes/${encodeURIComponent(homeId)}`, jsonInit("PATCH", data, userId))
}

export function deleteHome(homeId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ success: boolean; message?: string }>(
    `/api/v1/homes/${encodeURIComponent(homeId)}`,
    jsonInit("DELETE", {}, userId),
  )
}

export function listPublicHomes() {
  return readApiJson<HomeListResponse>("/api/v1/homes")
}

export function addMemberToHome(homeId: string, data: HomeMemberWriteData, userId = DEFAULT_OWNER_ID) {
  return readApiJson<HomeMember | null>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/members`,
    jsonInit("POST", data, userId),
  )
}

export function updateMemberInHome(
  homeId: string,
  memberId: string,
  data: Partial<HomeMemberWriteData>,
  userId = DEFAULT_OWNER_ID,
) {
  return readApiJson<HomeMember | null>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/members/${encodeURIComponent(memberId)}`,
    jsonInit("PATCH", data, userId),
  )
}

export function removeMemberFromHome(homeId: string, memberId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ success: boolean; message?: string }>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/members/${encodeURIComponent(memberId)}`,
    jsonInit("DELETE", {}, userId),
  )
}

export function visitHome(homeId: string, visitorId?: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<HomeVisitResponse>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/visit`,
    jsonInit("POST", { visitor_id: visitorId }, userId),
  )
}

export function leaveHomeMessage(homeId: string, content: string, visitorNickname = "旅人", userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ success: boolean }>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/visit/message`,
    jsonInit("POST", { content, visitor_nickname: visitorNickname }, userId),
  )
}

export function chatWithHomeMember(
  homeId: string,
  memberId: string,
  message: string,
  visitorId?: string,
  userId = DEFAULT_VISITOR_ID,
) {
  return readApiJson<HomeChatResponse>(
    `/api/v1/homes/${encodeURIComponent(homeId)}/chat`,
    jsonInit("POST", { member_id: memberId, message, visitor_id: visitorId }, userId),
  )
}

export type NpcRelationshipResetResponse = {
  reset: boolean
  bond_revoked: boolean
}

export function resetNpcRelationship(
  tavernId: string,
  characterId: string,
  reason = "",
  userId = DEFAULT_VISITOR_ID
) {
  return readApiJson<NpcRelationshipResetResponse>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/relationship/reset`,
    jsonInit("POST", { reason }, userId)
  )
}

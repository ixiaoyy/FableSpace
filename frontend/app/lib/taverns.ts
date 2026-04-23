import { jsonInit, readApiBlob, readApiJson } from "./api-client"

export const DEFAULT_OWNER_ID = "owner-demo"
export const DEFAULT_VISITOR_ID = "visitor-demo"

export type TavernCharacter = {
  id: string
  name: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  avatar?: string
  image_url?: string
  sprites?: Record<string, string>
  appearance?: Record<string, unknown>
  talkativeness?: number
  tags?: string[]
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
  visit_count?: number
  characters?: TavernCharacter[]
  world_info?: unknown[]
  gameplay_definitions?: unknown[]
}

export type TavernListResponse = {
  taverns: Tavern[]
  count: number
}

export type ChatMessage = {
  id?: string
  role: "user" | "assistant" | string
  content: string
  character_id?: string
  visitor_id?: string
  visitor_name?: string
  timestamp?: string
}

export type ChatResponse = {
  character_id: string
  character_name: string
  response: string
  degraded?: boolean
  degradation?: {
    title?: string
    message?: string
    action?: string
  } | null
  tavern_status?: string
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
  output_rules?: Record<string, unknown>
}

export type GroupChatResponse = {
  messages: GroupChatMessage[]
  speaker_count?: number
  strategy?: string
  degraded?: boolean
  error?: string
  visitor_state?: unknown
  created_memories?: unknown[]
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

export type TavernVisitor = {
  visitor_id: string
  tavern_id: string
  visit_count: number
  first_visit?: string | null
  last_visit?: string | null
  relationship?: Record<string, unknown>
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
  system_prompt?: string
  first_mes?: string
  mes_example?: string
  alternate_greetings?: string[]
  tags?: string[]
  sprites?: Record<string, string>
  world_info?: Record<string, unknown>[]
  source_format?: string
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

function queryString(params: Record<string, string | number | undefined | null>) {
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

export function createTavern(data: Partial<Tavern> & Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<Tavern>("/api/v1/taverns", jsonInit("POST", data, userId))
}

export function getTavern(tavernId: string, userId = "") {
  return readApiJson<Tavern>(`/api/v1/taverns/${encodeURIComponent(tavernId)}`, { userId })
}

export function enterTavern(tavernId: string, password = "", userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ ok: boolean; first_mes?: string; visitor_state?: unknown }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/enter`,
    jsonInit("POST", { password }, userId),
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

export function getTavernChatHistory(tavernId: string, visitorId = DEFAULT_VISITOR_ID, characterId = "") {
  return readApiJson<{ messages: ChatMessage[] }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/chat${queryString({
      visitor_id: visitorId,
      character_id: characterId,
    })}`,
    { userId: visitorId },
  )
}

export function sendTavernChat(
  tavernId: string,
  data: {
    character_id: string
    message: string
    visitor_id: string
    visitor_name?: string
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
  data: { message: string; visitor_id: string; visitor_name?: string; display_message?: string },
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

export function getVoiceConfig(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<{ voice_config: VoiceConfig }>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`, { userId })
}

export function saveVoiceConfig(tavernId: string, data: Partial<VoiceConfig>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; voice_config: VoiceConfig }>(
    `/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`,
    jsonInit("PUT", data, userId),
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

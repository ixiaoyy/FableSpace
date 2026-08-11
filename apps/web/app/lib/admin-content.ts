import { jsonInit, readApiJson } from "./api-client"

export type PublicationStatus = "draft" | "published" | "archived"
export type CanonCategory = "fixed_fact" | "story_setting" | "needs_verification"
export type StoryKind = "growth" | "ensemble"
export type StoryExperienceMode = "character_growth" | "narrative_story"
export type StoryReplayPolicy = "replayable" | "permanent_result"
export type StoryChoicePresentation = "inline" | "permanent_decision"
export type PostEndingMessageMode = "llm" | "unanswered" | "disabled"
export type StoryNodePresentationKind = "character" | "system" | "action"
export type PredicateValue = string | number | boolean

export type CanonEntry = {
  id: string
  category: CanonCategory
  statement: string
  sources: string[]
}

export type RelationshipStage = {
  id: string
  label: string
  minimum_affinity: number
  attitude: string
}

export type RelationshipRules = {
  minimum_affinity: number
  maximum_affinity: number
  initial_affinity: number
  natural_turn_max_delta: number
  stages: RelationshipStage[]
}

export type Character = {
  id: string
  story_world_id: string
  name: string
  identity: string
  age: string
  social_position: string
  motive: string
  secret: string
  voice: string
  portrait_url: string | null
  relationship_rules: RelationshipRules
}

export type PlayerRole = {
  id: string
  story_world_id: string
  name: string
  age: string
  social_position: string
  gender: string
  background: string
  entry_reason: string
  character_visible_information: string[]
  avatar_url: string | null
}

export type RelationshipEffect = {
  character_id: string
  affinity_delta: number
  reason: string
  set_flags: string[]
}

export type StoryChoice = {
  id: string
  label: string
  next_node_id: string
  is_key: boolean
  required_flags: string[]
  blocked_flags: string[]
  set_flags: string[]
  relationship_effects: RelationshipEffect[]
}

export type StoryNode = {
  id: string
  presentation_kind: StoryNodePresentationKind
  character_id: string | null
  narration: string
  choice_presentation: StoryChoicePresentation
  confirmation_prompt: string | null
  choices: StoryChoice[]
  ending_id: string | null
}

export type StoryChapter = {
  id: string
  title: string
  entry_node_id: string
  nodes: StoryNode[]
}

export type StoryEnding = {
  id: string
  title: string
  summary: string
  post_ending_message_mode: PostEndingMessageMode
  unanswered_reply: string | null
  post_ending_context: string | null
}

export type StoryCharacterParticipation = {
  character_id: string
  current_situation: string
  opening_line: string
  can_start: boolean
  location_label: string
  arrival_narration: string
  visit_required_flags: string[]
  visit_set_flags: string[]
  knowledge_entry_ids: string[]
}

export type HistoricalReferenceUnlock = {
  entry_id: string
  required_flags: string[]
}

export type DecisionPredicate =
  | { kind: "story_flag"; flag: string; expected: boolean }
  | {
      kind: "investigation_result"
      result_id: string
      expected_value: PredicateValue
    }
  | { kind: "player_commitment"; action_id: string; expected: boolean }
  | { kind: "current_character"; character_id: string }
  | {
      kind: "relationship_range"
      character_id: string
      minimum_affinity?: number
      maximum_affinity?: number
    }

export type DecisionRule = {
  id: string
  conditions: DecisionPredicate[]
  next_node_id: string
  set_flags: string[]
  relationship_effects: RelationshipEffect[]
  reason: string
}

export type CharacterDecision = {
  id: string
  character_id: string
  trigger_node_id: string
  rules: DecisionRule[]
}

export type ReviewedStory = {
  id: string
  title: string
  summary: string
  kind: StoryKind
  experience_mode: StoryExperienceMode
  replay_policy: StoryReplayPolicy
  publication_status: PublicationStatus
  focus_character_id: string | null
  participants: StoryCharacterParticipation[]
  historical_reference_unlocks: HistoricalReferenceUnlock[]
  entry_chapter_id: string
  chapters: StoryChapter[]
  endings: StoryEnding[]
  character_decisions: CharacterDecision[]
}

export type StoryWorldDocument = {
  id: string
  title: string
  summary: string
  genre: string
  publication_status: PublicationStatus
  content_version: string
  player_roles: PlayerRole[]
  characters: Character[]
  stories: ReviewedStory[]
  canon_entries: CanonEntry[]
}

export type StoryWorldSummary = {
  id: string
  title: string
  summary: string
  genre: string
  story_count: number
  published_story_count: number
  character_count: number
  updated_at: string
}

export type StoryWorldResponse = {
  story_world: StoryWorldDocument
  updated_at: string
}

export type UploadedAsset = {
  id: string
  object_key: string
  url: string
  byte_count: number
  sha256: string
  mime_type: string
  width: number | null
  height: number | null
  source_type: "user-provided"
  source_note: string
  created_at: string
}

export async function listManagedStoryWorlds() {
  return readApiJson<{ story_worlds: StoryWorldSummary[] }>(
    "/api/v1/admin/story-worlds",
  )
}

export async function getManagedStoryWorld(storyWorldId: string) {
  return readApiJson<StoryWorldResponse>(
    `/api/v1/admin/story-worlds/${encodeURIComponent(storyWorldId)}`,
  )
}

export async function saveManagedStoryWorld(
  storyWorldId: string,
  storyWorld: StoryWorldDocument,
) {
  return readApiJson<StoryWorldResponse>(
    `/api/v1/admin/story-worlds/${encodeURIComponent(storyWorldId)}`,
    jsonInit("PUT", { story_world: storyWorld }),
  )
}

export async function uploadCharacterPortrait(
  storyWorldId: string,
  characterId: string,
  image: File,
  sourceNote: string,
) {
  const form = new FormData()
  form.set("image", image)
  form.set("source_note", sourceNote)
  return readApiJson<StoryWorldResponse & { asset: UploadedAsset }>(
    `/api/v1/admin/story-worlds/${encodeURIComponent(storyWorldId)}` +
      `/characters/${encodeURIComponent(characterId)}/portrait`,
    { method: "POST", body: form },
  )
}

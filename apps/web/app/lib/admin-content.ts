import { jsonInit, readApiJson } from "./api-client"

export type PublicationStatus = "draft" | "published" | "archived"
export type CanonCategory = "fixed_fact" | "story_setting" | "needs_verification"

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
  current_situation: string
  opening_line: string
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
  narration: string
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
}

export type StoryWorldDocument = {
  id: string
  title: string
  summary: string
  genre: string
  publication_status: PublicationStatus
  content_version: string
  entry_chapter_id: string
  player_roles: PlayerRole[]
  characters: Character[]
  chapters: StoryChapter[]
  endings: StoryEnding[]
  canon_entries: CanonEntry[]
}

export type StoryWorldSummary = {
  id: string
  title: string
  summary: string
  genre: string
  chapter_count: number
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

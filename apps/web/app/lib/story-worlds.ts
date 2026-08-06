import { jsonInit, readApiJson } from "./api-client"

export type StoryWorldCharacterDetail = {
  story_world: {
    id: string
    title: string
    summary: string
    genre: string
    content_version: string
  }
  character: {
    id: string
    name: string
    portrait_url: string | null
    relationship_stage: RelationshipStage
  }
  characters: Array<{
    id: string
    name: string
    portrait_url: string | null
    relationship_stage: RelationshipStage
  }>
  stories: PublishedStory[]
  player_roles: PlayerRole[]
}

export type StoryKind = "growth" | "ensemble"

export type StoryNodePresentationKind = "character" | "system" | "action"

export type PublishedStory = {
  id: string
  title: string
  summary: string
  kind: StoryKind
  current_situation: string
  opening_preview: string
  focus_character_id: string | null
  participant_character_ids: string[]
}

export type PlayerRole = {
  id: string
  name: string
  age: string
  gender: string
  social_position: string
  background: string
  entry_reason: string
  character_visible_information: string[]
  avatar_url: string | null
}

export type RelationshipStage = {
  id: string
  label: string
  attitude: string
  last_change_reason?: string
}

export type HistoricalReferenceCategory =
  | "fixed_fact"
  | "story_setting"
  | "needs_verification"

export type HistoricalReference = {
  stage: "opening" | "investigation" | "outcome"
  unlocked_count: number
  total_count: number
  entries: Array<{
    id: string
    category: HistoricalReferenceCategory
    statement: string
    sources: string[]
  }>
}

export type StoryRun = {
  id: string
  status: "active" | "completed"
  content_version: string
  story: {
    id: string
    title: string
    kind: StoryKind
  }
  player_role: PlayerRole
  current_node: {
    id: string
    narration: string
    presentation_kind: StoryNodePresentationKind
    character_id: string | null
    choices: Array<{ id: string; label: string; is_key: boolean }>
  }
  events: Array<{
    id: string
    sequence: number
    type: "message" | "choice" | "narration" | "relationship_changed"
    role: "player" | "character" | "system" | null
    character_id: string | null
    character_name: string | null
    content: string
  }>
  relationship: RelationshipStage
  historical_reference: HistoricalReference
  ending: { id: string; title: string; summary: string } | null
  next_character: { id: string; name: string } | null
  completed_run_summaries: Array<{
    story_run_id: string
    story_id: string
    ending_id: string
    title: string
    summary: string
  }>
}

type RunResponse = { run: StoryRun | null }

export type StoryRunContinuity = {
  id: string
  story_id: string
  status: "active" | "completed"
  content_version: string
  player_role_id: string
  can_resume: boolean
  recent_character_messages: Array<{
    character_id: string
    content: string
  }>
  ending_summary: string | null
}

type ContinuityResponse = { continuity: StoryRunContinuity | null }

function storyWorldBase(storyWorldId: string) {
  return `/api/v1/story-worlds/${encodeURIComponent(storyWorldId)}`
}

/** Build the private runtime base for one reviewed Story without guessing an ID. */
function storyRuntimeBase(storyWorldId: string, storyId: string) {
  return `${storyWorldBase(storyWorldId)}/stories/${encodeURIComponent(storyId)}/runs`
}

export function getStoryWorldCharacter(storyWorldId: string, characterId: string) {
  return readApiJson<StoryWorldCharacterDetail>(
    `${storyWorldBase(storyWorldId)}/characters/${encodeURIComponent(characterId)}`,
  )
}

export async function getCurrentStoryRun(
  storyWorldId: string,
  storyId: string,
  characterId: string,
) {
  const query = new URLSearchParams({ character_id: characterId })
  return (await readApiJson<RunResponse>(
    `${storyRuntimeBase(storyWorldId, storyId)}/current?${query.toString()}`,
  )).run
}

/** Read the latest private run summary without refreshing or advancing StoryRun state. */
export async function getStoryRunContinuity(
  storyWorldId: string,
  storyId: string,
) {
  return (await readApiJson<ContinuityResponse>(
    `${storyRuntimeBase(storyWorldId, storyId)}/continuity`,
  )).continuity
}

export async function startStoryRun(
  storyWorldId: string,
  storyId: string,
  characterId: string,
  playerRoleId: string,
) {
  return (await readApiJson<RunResponse>(
    storyRuntimeBase(storyWorldId, storyId),
    jsonInit("POST", {
      character_id: characterId,
      player_role_id: playerRoleId,
    }),
  )).run
}

export async function restartStoryRun(
  storyWorldId: string,
  storyId: string,
  characterId: string,
  playerRoleId: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyRuntimeBase(storyWorldId, storyId)}/restart`,
    jsonInit("POST", {
      character_id: characterId,
      player_role_id: playerRoleId,
    }),
  )).run
}

export async function sendStoryMessage(
  storyWorldId: string,
  storyId: string,
  runId: string,
  characterId: string,
  content: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyRuntimeBase(storyWorldId, storyId)}/${encodeURIComponent(runId)}/messages`,
    jsonInit("POST", { character_id: characterId, content }),
  )).run
}

export async function chooseStoryPath(
  storyWorldId: string,
  storyId: string,
  runId: string,
  characterId: string,
  choiceId: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyRuntimeBase(storyWorldId, storyId)}/${encodeURIComponent(runId)}/choices`,
    jsonInit("POST", { character_id: characterId, choice_id: choiceId }),
  )).run
}

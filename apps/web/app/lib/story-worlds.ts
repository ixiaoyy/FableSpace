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
    current_situation: string
    opening_preview: string
    relationship_stage: RelationshipStage
  }
  characters: Array<{
    id: string
    name: string
    current_situation: string
    relationship_stage: RelationshipStage
  }>
  player_roles: PlayerRole[]
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
  player_role: PlayerRole
  current_node: {
    id: string
    narration: string
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
  completed_run_summaries: Array<{
    story_run_id: string
    ending_id: string
    title: string
    summary: string
  }>
}

type RunResponse = { run: StoryRun | null }

function storyWorldBase(storyWorldId: string) {
  return `/api/v1/story-worlds/${encodeURIComponent(storyWorldId)}`
}

export function getStoryWorldCharacter(storyWorldId: string, characterId: string) {
  return readApiJson<StoryWorldCharacterDetail>(
    `${storyWorldBase(storyWorldId)}/characters/${encodeURIComponent(characterId)}`,
  )
}

export async function getCurrentStoryRun(storyWorldId: string, characterId: string) {
  const query = new URLSearchParams({ character_id: characterId })
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/current?${query.toString()}`,
  )).run
}

export async function startStoryRun(
  storyWorldId: string,
  characterId: string,
  playerRoleId: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs`,
    jsonInit("POST", {
      character_id: characterId,
      player_role_id: playerRoleId,
    }),
  )).run
}

export async function restartStoryRun(
  storyWorldId: string,
  characterId: string,
  playerRoleId: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/restart`,
    jsonInit("POST", {
      character_id: characterId,
      player_role_id: playerRoleId,
    }),
  )).run
}

export async function sendStoryMessage(
  storyWorldId: string,
  runId: string,
  characterId: string,
  content: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/${encodeURIComponent(runId)}/messages`,
    jsonInit("POST", { character_id: characterId, content }),
  )).run
}

export async function chooseStoryPath(
  storyWorldId: string,
  runId: string,
  characterId: string,
  choiceId: string,
) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/${encodeURIComponent(runId)}/choices`,
    jsonInit("POST", { character_id: characterId, choice_id: choiceId }),
  )).run
}

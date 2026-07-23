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
  player_role: {
    id: string
    name: string
    gender: string
    background: string
    entry_reason: string
    character_visible_information: string[]
  }
}

export type RelationshipStage = {
  id: string
  label: string
  attitude: string
  last_change_reason?: string
}

export type StoryRun = {
  id: string
  status: "active" | "completed"
  content_version: string
  current_node: {
    id: string
    narration: string
    choices: Array<{ id: string; label: string; is_key: boolean }>
  }
  events: Array<{
    id: string
    sequence: number
    type: "message" | "choice" | "narration"
    role: "player" | "character" | "system" | null
    character_id: string | null
    content: string
  }>
  relationship: RelationshipStage
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

export async function getCurrentStoryRun(storyWorldId: string) {
  return (await readApiJson<RunResponse>(`${storyWorldBase(storyWorldId)}/runs/current`)).run
}

export async function startStoryRun(storyWorldId: string) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs`,
    jsonInit("POST"),
  )).run
}

export async function restartStoryRun(storyWorldId: string) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/restart`,
    jsonInit("POST"),
  )).run
}

export async function sendStoryMessage(storyWorldId: string, runId: string, content: string) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/${encodeURIComponent(runId)}/messages`,
    jsonInit("POST", { content }),
  )).run
}

export async function chooseStoryPath(storyWorldId: string, runId: string, choiceId: string) {
  return (await readApiJson<RunResponse>(
    `${storyWorldBase(storyWorldId)}/runs/${encodeURIComponent(runId)}/choices`,
    jsonInit("POST", { choice_id: choiceId }),
  )).run
}

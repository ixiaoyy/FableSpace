import { getSpace, type Space, type SpaceCharacter, type SpaceListResponse } from "./spaces"

export const HISTORY_PILOT_SPACE_ID = "history_broad_street_water_1854"
export const HISTORY_PILOT_CHARACTER_ID = "char_history_broad_street_annie"
export const HISTORY_PILOT_OWNER_ID = "system_public_welfare"

export class HistoryPilotContractError extends Error {
  constructor(reason: string) {
    super(`历史故事入口暂不可用：${reason}`)
    this.name = "HistoryPilotContractError"
  }
}

function validateHistoryPilotSpace(space: Space): Space {
  if (!space || space.id !== HISTORY_PILOT_SPACE_ID) {
    throw new HistoryPilotContractError("返回了不匹配的 Space")
  }
  if (space.owner_id !== HISTORY_PILOT_OWNER_ID) {
    throw new HistoryPilotContractError("不属于系统公益内容")
  }
  if (space.access !== "public") {
    throw new HistoryPilotContractError("当前不是公开访问")
  }
  if (space.status !== "open") {
    throw new HistoryPilotContractError("当前未开放")
  }

  const character = (Array.isArray(space.characters) ? space.characters : [])
    .find((candidate): candidate is SpaceCharacter => candidate?.id === HISTORY_PILOT_CHARACTER_ID)
  if (!character) {
    throw new HistoryPilotContractError(`缺少角色 ${HISTORY_PILOT_CHARACTER_ID}`)
  }

  return {
    ...space,
    characters: [character],
  }
}

/**
 * Load the single reviewed historical encounter used by the homepage pilot.
 * The existing three-Space discovery contract remains independent.
 */
export async function loadHistoryPilotSpace(): Promise<SpaceListResponse> {
  try {
    const space = validateHistoryPilotSpace(
      await getSpace(HISTORY_PILOT_SPACE_ID, "", { view: "entry" }),
    )
    return {
      spaces: [space],
      count: 1,
      total: 1,
      limit: 1,
      offset: 0,
      has_more: false,
    }
  } catch (error) {
    if (error instanceof HistoryPilotContractError) throw error
    const detail = error instanceof Error ? error.message : String(error || "")
    throw new HistoryPilotContractError(detail || "读取失败")
  }
}

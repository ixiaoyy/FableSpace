import { getSpace, type Space, type SpaceCharacter, type SpaceListResponse } from "./spaces"

export const LAUNCH_STORY_SPACE_CONTRACT = [
  {
    spaceId: "story_palace_snow_edict",
    characterIds: [
      "char_story_palace_eunuch_wei",
      "char_story_palace_princess_xiao",
    ],
  },
  {
    spaceId: "story_ghost_foxfire_debt",
    characterIds: [
      "char_story_ghost_fox_spirit_feiyue",
      "char_story_ghost_scholar_ning",
    ],
  },
  {
    spaceId: "story_campus_last_class",
    characterIds: [
      "char_story_campus_teacher_shen",
      "char_story_campus_heir_gu",
    ],
  },
] as const

type LaunchStorySpaceContract = (typeof LAUNCH_STORY_SPACE_CONTRACT)[number]

export class LaunchStoryContractError extends Error {
  constructor(spaceId: string, reason: string) {
    super(`官方首发故事数据暂不可用：${spaceId} ${reason}`)
    this.name = "LaunchStoryContractError"
  }
}

function requireContractCharacter(
  charactersById: Map<string, SpaceCharacter>,
  contract: LaunchStorySpaceContract,
  characterId: string,
) {
  const character = charactersById.get(characterId)
  if (!character) {
    throw new LaunchStoryContractError(contract.spaceId, `缺少角色 ${characterId}`)
  }
  return character
}

function validateLaunchStorySpace(space: Space, contract: LaunchStorySpaceContract): Space {
  if (!space || space.id !== contract.spaceId) {
    throw new LaunchStoryContractError(contract.spaceId, "返回了不匹配的 Space")
  }
  if (space.access !== "public") {
    throw new LaunchStoryContractError(contract.spaceId, "当前不是公开访问")
  }
  if (space.status !== "open") {
    throw new LaunchStoryContractError(contract.spaceId, "当前未开放")
  }

  const charactersById = new Map(
    (Array.isArray(space.characters) ? space.characters : [])
      .filter((character): character is SpaceCharacter => Boolean(character?.id))
      .map((character) => [character.id, character]),
  )
  const characters = contract.characterIds.map((characterId) =>
    requireContractCharacter(charactersById, contract, characterId),
  )

  return {
    ...space,
    characters,
  }
}

/**
 * Loads and validates the accepted three-Space launch collection without substituting other public content.
 * @returns Three public, open system Spaces in contract order, each projected to its two real API characters.
 * @throws When any request fails or published story content no longer matches the accepted access/status/character contract.
 */
export async function loadLaunchStorySpaces(): Promise<SpaceListResponse> {
  try {
    const responses = await Promise.all(
      LAUNCH_STORY_SPACE_CONTRACT.map((contract) =>
        getSpace(contract.spaceId, "", { view: "entry" }),
      ),
    )
    const spaces = responses.map((space, index) =>
      validateLaunchStorySpace(space, LAUNCH_STORY_SPACE_CONTRACT[index]),
    )

    return {
      spaces,
      count: spaces.length,
      total: spaces.length,
      limit: spaces.length,
      offset: 0,
      has_more: false,
    }
  } catch (error) {
    if (error instanceof LaunchStoryContractError) throw error
    const detail = error instanceof Error ? error.message : String(error || "")
    throw new Error(`官方首发故事数据暂不可用${detail ? `：${detail}` : ""}`)
  }
}

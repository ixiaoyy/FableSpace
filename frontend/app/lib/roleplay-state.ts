import type { RoleplayState, Space, SpaceCharacter } from "./spaces"

export function fallbackRoleplayState(space: Space, characters: SpaceCharacter[]): RoleplayState {
  return {
    space_id: space.id,
    roleplay_mode: space.roleplay_mode || "ai_only",
    claims: space.character_claims || [],
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      avatar: character.avatar,
    })),
  }
}

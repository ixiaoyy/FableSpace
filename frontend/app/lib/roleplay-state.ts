import type { RoleplayState, Tavern, TavernCharacter } from "./taverns"

export function fallbackRoleplayState(tavern: Tavern, characters: TavernCharacter[]): RoleplayState {
  return {
    tavern_id: tavern.id,
    roleplay_mode: tavern.roleplay_mode || "ai_only",
    claims: tavern.character_claims || [],
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      avatar: character.avatar,
    })),
  }
}

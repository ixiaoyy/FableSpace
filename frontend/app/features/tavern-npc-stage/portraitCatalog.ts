import {
  NPC_CHARACTER_PORTRAITS,
  NPC_PORTRAIT_CATALOG,
  type NpcPortraitArchetype,
  type NpcPortraitEntry,
  type NpcPortraitMatch,
} from "./portraitCatalogConfig"
import type { Tavern, TavernCharacter } from "../../lib/taverns"

export type { NpcPortraitArchetype } from "./portraitCatalogConfig"

export function normalizeNpcSearchText(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeNpcSearchText).join(" ")
  return typeof value === "string" ? value.toLowerCase() : ""
}

export function getNpcAppearanceIds(character: TavernCharacter): string[] {
  const appearance = character.appearance || {}
  const ids = [
    appearance.active_preset_id,
    appearance.active,
    ...(Array.isArray(appearance.wardrobe_ids) ? appearance.wardrobe_ids : []),
    ...(Array.isArray(appearance.wardrobe) ? appearance.wardrobe : []),
  ]
  return ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
}

function hashText(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash * 33) + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function entryForArchetype(archetype: NpcPortraitArchetype): NpcPortraitEntry {
  return NPC_PORTRAIT_CATALOG.find((entry) => entry.archetype === archetype) || NPC_PORTRAIT_CATALOG[0]
}

export function resolveNpcPortraitMatch(
  character: TavernCharacter,
  tavern: Tavern,
  preferredArchetypes: NpcPortraitArchetype[],
  index: number,
): NpcPortraitMatch {
  const characterPortrait = NPC_CHARACTER_PORTRAITS[character.id]
  if (characterPortrait) return characterPortrait

  const appearanceIds = getNpcAppearanceIds(character)
  const searchText = [
    character.name,
    character.description,
    character.personality,
    character.scenario,
    character.first_mes,
    normalizeNpcSearchText(character.tags || []),
    tavern.name,
    tavern.description,
    tavern.scene_prompt,
  ].join(" ").toLowerCase()

  const matchedEntry = (
    NPC_PORTRAIT_CATALOG.find((entry) => appearanceIds.some((id) => entry.appearanceIds.includes(id)))
    || NPC_PORTRAIT_CATALOG.find((entry) => entry.keywords.some((keyword) => searchText.includes(keyword.toLowerCase())))
    || entryForArchetype(preferredArchetypes[index % preferredArchetypes.length] || "merchant")
  )

  const variantSeed = [
    character.id,
    character.name,
    matchedEntry.archetype,
    tavern.id,
    String(index),
  ].join("|")
  const variant = matchedEntry.variants[hashText(variantSeed) % matchedEntry.variants.length]
  return {
    archetype: matchedEntry.archetype,
    variant: variant.id,
    src: variant.src,
  }
}

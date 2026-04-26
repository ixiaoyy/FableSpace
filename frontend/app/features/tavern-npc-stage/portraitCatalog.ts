import alien9Delta from "../../assets/npc-style-cast/portraits/alien-9-delta.png"
import alienMuMu from "../../assets/npc-style-cast/portraits/alien-mu-mu.png"
import alienPiPi from "../../assets/npc-style-cast/portraits/alien-pi-pi.png"
import alienV17 from "../../assets/npc-style-cast/portraits/alien-v17.png"
import commissionMozhan from "../../assets/npc-style-cast/portraits/commission-mozhan.png"
import commissionZhideng from "../../assets/npc-style-cast/portraits/commission-zhideng.png"
import guardianA from "../../assets/npc-style-cast/portraits/guardian-a.png"
import guardianB from "../../assets/npc-style-cast/portraits/guardian-b.png"
import healerA from "../../assets/npc-style-cast/portraits/healer-a.png"
import healerB from "../../assets/npc-style-cast/portraits/healer-b.png"
import merchantA from "../../assets/npc-style-cast/portraits/merchant-a.png"
import merchantB from "../../assets/npc-style-cast/portraits/merchant-b.png"
import scholarA from "../../assets/npc-style-cast/portraits/scholar-a.png"
import scholarB from "../../assets/npc-style-cast/portraits/scholar-b.png"
import spiritA from "../../assets/npc-style-cast/portraits/spirit-a.png"
import spiritB from "../../assets/npc-style-cast/portraits/spirit-b.png"
import wandererA from "../../assets/npc-style-cast/portraits/wanderer-a.png"
import wandererB from "../../assets/npc-style-cast/portraits/wanderer-b.png"

import type { Tavern, TavernCharacter } from "../../lib/taverns"

export type NpcPortraitArchetype =
  | "merchant"
  | "guardian"
  | "healer"
  | "scholar"
  | "wanderer"
  | "spirit"

type NpcPortraitVariant = {
  id: "a" | "b"
  src: string
}

type NpcPortraitEntry = {
  archetype: NpcPortraitArchetype
  keywords: string[]
  appearanceIds: string[]
  variants: [NpcPortraitVariant, NpcPortraitVariant]
}

export type NpcPortraitMatch = {
  archetype: NpcPortraitArchetype
  variant: "a" | "b"
  src: string
}

const NPC_CHARACTER_PORTRAITS: Record<string, NpcPortraitMatch> = {
  char_pw_9_delta: { archetype: "scholar", variant: "a", src: alien9Delta },
  char_pw_mu_mu: { archetype: "merchant", variant: "a", src: alienMuMu },
  char_pw_v17: { archetype: "scholar", variant: "b", src: alienV17 },
  char_pw_pi_pi: { archetype: "merchant", variant: "b", src: alienPiPi },
  char_pw_mozhan: { archetype: "scholar", variant: "a", src: commissionMozhan },
  char_pw_zhideng: { archetype: "guardian", variant: "a", src: commissionZhideng },
}

const NPC_PORTRAIT_CATALOG: NpcPortraitEntry[] = [
  {
    archetype: "merchant",
    keywords: [
      "merchant", "trader", "vendor", "broker", "quartermaster", "shop", "supply",
      "商人", "掌柜", "老板", "店主", "店员", "补给", "后勤", "交易", "货", "采购",
    ],
    appearanceIds: [
      "city-photographer", "rain-clerk", "tea-storyteller",
    ],
    variants: [
      { id: "a", src: merchantA },
      { id: "b", src: merchantB },
    ],
  },
  {
    archetype: "guardian",
    keywords: [
      "guardian", "guard", "warden", "sentinel", "bouncer", "security", "watch",
      "守卫", "护卫", "卫兵", "门卫", "保安", "巡逻", "看门",
    ],
    appearanceIds: [
      "night-platform", "neon-maintainer",
    ],
    variants: [
      { id: "a", src: guardianA },
      { id: "b", src: guardianB },
    ],
  },
  {
    archetype: "healer",
    keywords: [
      "healer", "medic", "doctor", "nurse", "clinic", "apothecary", "herbalist", "remedy",
      "疗愈", "治疗", "医生", "护士", "药", "草药", "医师", "诊所", "治愈",
    ],
    appearanceIds: [
      "greenhouse-guide",
    ],
    variants: [
      { id: "a", src: healerA },
      { id: "b", src: healerB },
    ],
  },
  {
    archetype: "scholar",
    keywords: [
      "scholar", "scribe", "archivist", "researcher", "librarian", "professor", "teacher", "book",
      "学者", "档案", "研究", "图书", "馆员", "书记", "老师", "教授", "书", "学术",
    ],
    appearanceIds: [
      "museum-docent", "archive-curator", "dusty-bookshop",
    ],
    variants: [
      { id: "a", src: scholarA },
      { id: "b", src: scholarB },
    ],
  },
  {
    archetype: "wanderer",
    keywords: [
      "wanderer", "traveler", "drifter", "pilgrim", "stranger", "ranger", "route", "journey",
      "流浪", "旅人", "旅行", "过客", "陌生人", "行路", "漂泊", "访客",
    ],
    appearanceIds: [
      "ferry-keeper",
    ],
    variants: [
      { id: "a", src: wandererA },
      { id: "b", src: wandererB },
    ],
  },
  {
    archetype: "spirit",
    keywords: [
      "spirit", "ghost", "specter", "oracle", "echo", "fae", "ethereal",
      "精灵", "灵体", "幽灵", "灵", "魂", "神谕", "星灵", "幻影",
    ],
    appearanceIds: [
      "fortune-reader",
    ],
    variants: [
      { id: "a", src: spiritA },
      { id: "b", src: spiritB },
    ],
  },
]

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

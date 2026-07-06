import alien9Delta from "../../assets/npc-style-cast/portraits-hd/alien-9-delta.png"
import alienMuMu from "../../assets/npc-style-cast/portraits-hd/alien-mu-mu.png"
import alienPiPi from "../../assets/npc-style-cast/portraits-hd/alien-pi-pi.png"
import alienV17 from "../../assets/npc-style-cast/portraits-hd/alien-v17.png"
import commissionMozhan from "../../assets/npc-style-cast/portraits-hd/commission-mozhan.png"
import commissionZhideng from "../../assets/npc-style-cast/portraits-hd/commission-zhideng.png"
import guardianA from "../../assets/npc-style-cast/portraits-hd/guardian-a.png"
import guardianB from "../../assets/npc-style-cast/portraits-hd/guardian-b.png"
import healerA from "../../assets/npc-style-cast/portraits-hd/healer-a.png"
import healerB from "../../assets/npc-style-cast/portraits-hd/healer-b.png"
import merchantA from "../../assets/npc-style-cast/portraits-hd/merchant-a.png"
import merchantB from "../../assets/npc-style-cast/portraits-hd/merchant-b.png"
import scholarA from "../../assets/npc-style-cast/portraits-hd/scholar-a.png"
import scholarB from "../../assets/npc-style-cast/portraits-hd/scholar-b.png"
import spiritA from "../../assets/npc-style-cast/portraits-hd/spirit-a.png"
import spiritB from "../../assets/npc-style-cast/portraits-hd/spirit-b.png"
import wandererA from "../../assets/npc-style-cast/portraits-hd/wanderer-a.png"
import wandererB from "../../assets/npc-style-cast/portraits-hd/wanderer-b.png"


export type NpcPortraitArchetype =
  | "merchant"
  | "guardian"
  | "healer"
  | "scholar"
  | "wanderer"
  | "spirit"

export type NpcPortraitVariant = {
  id: "a" | "b"
  src: string
}

export type NpcPortraitEntry = {
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


export const DEFAULT_NPC_PREVIEW_PORTRAIT = merchantA
export const HOMEPAGE_NPC_PREVIEW_PORTRAITS = [merchantA, scholarA, spiritA, guardianA]

export const NPC_CHARACTER_PORTRAITS: Record<string, NpcPortraitMatch> = {
  char_pw_9_delta: { archetype: "scholar", variant: "a", src: alien9Delta },
  char_pw_mu_mu: { archetype: "merchant", variant: "a", src: alienMuMu },
  char_pw_v17: { archetype: "scholar", variant: "b", src: alienV17 },
  char_pw_pi_pi: { archetype: "merchant", variant: "b", src: alienPiPi },
  char_pw_mozhan: { archetype: "scholar", variant: "a", src: commissionMozhan },
  char_pw_zhideng: { archetype: "guardian", variant: "a", src: commissionZhideng },
}

export const NPC_PORTRAIT_CATALOG: NpcPortraitEntry[] = [
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


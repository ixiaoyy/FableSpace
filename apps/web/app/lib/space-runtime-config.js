import atmosphereEmberImage from "../assets/place-atmosphere-hd/atmosphere-ember.webp"
import atmosphereGroveImage from "../assets/place-atmosphere-hd/atmosphere-grove.webp"
import atmosphereHealingImage from "../assets/place-atmosphere-hd/atmosphere-healing.webp"
import atmosphereJudgementImage from "../assets/place-atmosphere-hd/atmosphere-judgement.webp"
import atmosphereLoreImage from "../assets/place-atmosphere-hd/atmosphere-lore.webp"
import atmosphereMarketImage from "../assets/place-atmosphere-hd/atmosphere-market.webp"
import atmosphereShrineImage from "../assets/place-atmosphere-hd/atmosphere-shrine.webp"
import atmosphereSpiritImage from "../assets/place-atmosphere-hd/atmosphere-spirit.webp"
import atmosphereSupplyImage from "../assets/place-atmosphere-hd/atmosphere-supply.webp"
import atmosphereTransitImage from "../assets/place-atmosphere-hd/atmosphere-transit.webp"

export const SPACE_IDENTITY_STORAGE_KEYS = Object.freeze({
  ownerId: "fablespace.ownerIdentity",
  visitorId: "fablespace.anonymousVisitorIdentity",
})

export function normalizeIdentity(value) {
  return String(value || "").trim()
}

function browserStorage() {
  try {
    return typeof globalThis !== "undefined" && globalThis.localStorage ? globalThis.localStorage : null
  } catch {
    return null
  }
}

function randomIdentityToken() {
  const bytes = new Uint32Array(2)
  try {
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes)
      return `${bytes[0].toString(36)}_${bytes[1].toString(36)}`
    }
  } catch {
    // Fall through to Math.random for non-browser test environments.
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getStoredOwnerIdentity(storage = browserStorage()) {
  if (!storage?.getItem) return ""
  return normalizeIdentity(storage.getItem(SPACE_IDENTITY_STORAGE_KEYS.ownerId))
}

export function rememberOwnerIdentity(ownerId, storage = browserStorage()) {
  const identity = normalizeIdentity(ownerId)
  if (identity && storage?.setItem) {
    storage.setItem(SPACE_IDENTITY_STORAGE_KEYS.ownerId, identity)
  }
  return identity
}

export function getOrCreateVisitorIdentity(storage = browserStorage()) {
  const existing = storage?.getItem ? normalizeIdentity(storage.getItem(SPACE_IDENTITY_STORAGE_KEYS.visitorId)) : ""
  if (existing) return existing
  const identity = `visitor_${randomIdentityToken()}`
  if (storage?.setItem) {
    storage.setItem(SPACE_IDENTITY_STORAGE_KEYS.visitorId, identity)
  }
  return identity
}

export function requireExplicitOwnerIdentity(ownerId, action = "店主操作") {
  const identity = normalizeIdentity(ownerId)
  if (!identity) {
    throw new Error(`${action}需要先确认店主身份`)
  }
  return identity
}

export function hasExplicitOwnerIdentity(ownerId) {
  return Boolean(normalizeIdentity(ownerId))
}

export const NEWCOMER_SPACE_CONFIG = Object.freeze({
  spaceId: "pw_lantern_helpdesk",
  query: "社区",
})

export const PUBLIC_WELFARE_NPC_EXPRESSION_PREVIEW_KEYS = Object.freeze([
  Object.freeze({ label: "自然", keys: Object.freeze(["neutral", "default"]) }),
  Object.freeze({ label: "高兴", keys: Object.freeze(["joy", "happy"]) }),
  Object.freeze({ label: "生气", keys: Object.freeze(["anger", "angry"]) }),
  Object.freeze({ label: "害羞", keys: Object.freeze(["embarrassment", "shy"]) }),
  Object.freeze({ label: "好奇", keys: Object.freeze(["curiosity", "curious"]) }),
])

const PUBLIC_WELFARE_NPC_EXPRESSION_ALIASES = Object.freeze({
  happy: "joy",
  angry: "anger",
  curious: "curiosity",
  shy: "embarrassment",
})

export function normalizePublicWelfareNpcAssetPath(src) {
  const value = String(src || "").trim()
  const match = value.match(/^\/assets\/npcs\/(char_pw_.+)-(neutral|joy|happy|anger|angry|curiosity|curious|embarrassment|shy)\.png$/)
  if (!match) return value
  const expression = PUBLIC_WELFARE_NPC_EXPRESSION_ALIASES[match[2]] || match[2]
  return `/assets/npcs/public-welfare/${match[1]}/${expression}.png`
}

const ATMOSPHERE_BY_TYPE = Object.freeze({
  healing_sanctum: atmosphereHealingImage,
  healing: atmosphereHealingImage,
  clinic_circle: atmosphereHealingImage,
  supply_outpost: atmosphereSupplyImage,
  supply: atmosphereSupplyImage,
  transit_node: atmosphereTransitImage,
  transit: atmosphereTransitImage,
  judgement_tower: atmosphereJudgementImage,
  judgement: atmosphereJudgementImage,
  order_bureau: atmosphereJudgementImage,
  ember_parlor: atmosphereEmberImage,
  ember: atmosphereEmberImage,
  lobby: atmosphereEmberImage,
  lore_academy: atmosphereLoreImage,
  lore: atmosphereLoreImage,
  archive_stack: atmosphereLoreImage,
  memory_collective: atmosphereLoreImage,
  whispering_grove: atmosphereGroveImage,
  grove: atmosphereGroveImage,
  spirit_anchor: atmosphereSpiritImage,
  spirit: atmosphereSpiritImage,
  forgotten_shrine: atmosphereShrineImage,
  shrine: atmosphereShrineImage,
  market_hall: atmosphereMarketImage,
  market: atmosphereMarketImage,
  market_gate: atmosphereMarketImage,
  hospital: atmosphereHealingImage,
  school: atmosphereLoreImage,
  bookstore: atmosphereLoreImage,
  restaurant: atmosphereMarketImage,
  cafe: atmosphereEmberImage,
  milk_tea_shop: atmosphereEmberImage,
  convenience_store: atmosphereSupplyImage,
  home: atmosphereEmberImage,
})

const ATMOSPHERE_BY_LAYOUT = Object.freeze({
  lobby: atmosphereEmberImage,
  "quest-play": atmosphereSupplyImage,
  "npc-chat": atmosphereLoreImage,
  "hybrid-room": atmosphereSpiritImage,
})

export const DEFAULT_ATMOSPHERE_IMAGE = atmosphereEmberImage

export const FALLBACK_ATMOSPHERE_IMAGES = Object.freeze([
  DEFAULT_ATMOSPHERE_IMAGE,
  atmosphereHealingImage,
  atmosphereMarketImage,
  atmosphereLoreImage,
  atmosphereGroveImage,
  atmosphereSpiritImage,
  atmosphereTransitImage,
  atmosphereSupplyImage,
  atmosphereShrineImage,
  atmosphereJudgementImage,
])

export const GENERIC_ATMOSPHERE_KEYS = new Set(["", "space", "lobby"])

export const SPACE_ATMOSPHERE_CONFIG = Object.freeze({
  byType: ATMOSPHERE_BY_TYPE,
  byLayout: ATMOSPHERE_BY_LAYOUT,
  defaultImage: DEFAULT_ATMOSPHERE_IMAGE,
  fallbackImages: FALLBACK_ATMOSPHERE_IMAGES,
  genericKeys: GENERIC_ATMOSPHERE_KEYS,
})

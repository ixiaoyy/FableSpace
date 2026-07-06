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
  healing_sanctum: "/place-atmosphere-hd/atmosphere-healing.png",
  healing: "/place-atmosphere-hd/atmosphere-healing.png",
  clinic_circle: "/place-atmosphere-hd/atmosphere-healing.png",
  supply_outpost: "/place-atmosphere-hd/atmosphere-supply.png",
  supply: "/place-atmosphere-hd/atmosphere-supply.png",
  transit_node: "/place-atmosphere-hd/atmosphere-transit.png",
  transit: "/place-atmosphere-hd/atmosphere-transit.png",
  judgement_tower: "/place-atmosphere-hd/atmosphere-judgement.png",
  judgement: "/place-atmosphere-hd/atmosphere-judgement.png",
  order_bureau: "/place-atmosphere-hd/atmosphere-judgement.png",
  ember_parlor: "/place-atmosphere-hd/atmosphere-ember.png",
  ember: "/place-atmosphere-hd/atmosphere-ember.png",
  lobby: "/place-atmosphere-hd/atmosphere-ember.png",
  lore_academy: "/place-atmosphere-hd/atmosphere-lore.png",
  lore: "/place-atmosphere-hd/atmosphere-lore.png",
  archive_stack: "/place-atmosphere-hd/atmosphere-lore.png",
  memory_collective: "/place-atmosphere-hd/atmosphere-lore.png",
  whispering_grove: "/place-atmosphere-hd/atmosphere-grove.png",
  grove: "/place-atmosphere-hd/atmosphere-grove.png",
  spirit_anchor: "/place-atmosphere-hd/atmosphere-spirit.png",
  spirit: "/place-atmosphere-hd/atmosphere-spirit.png",
  forgotten_shrine: "/place-atmosphere-hd/atmosphere-shrine.png",
  shrine: "/place-atmosphere-hd/atmosphere-shrine.png",
  market_hall: "/place-atmosphere-hd/atmosphere-market.png",
  market: "/place-atmosphere-hd/atmosphere-market.png",
  market_gate: "/place-atmosphere-hd/atmosphere-market.png",
  hospital: "/place-atmosphere-hd/atmosphere-healing.png",
  school: "/place-atmosphere-hd/atmosphere-lore.png",
  bookstore: "/place-atmosphere-hd/atmosphere-lore.png",
  restaurant: "/place-atmosphere-hd/atmosphere-market.png",
  cafe: "/place-atmosphere-hd/atmosphere-ember.png",
  milk_tea_shop: "/place-atmosphere-hd/atmosphere-ember.png",
  convenience_store: "/place-atmosphere-hd/atmosphere-supply.png",
  home: "/place-atmosphere-hd/atmosphere-ember.png",
})

const ATMOSPHERE_BY_LAYOUT = Object.freeze({
  lobby: "/place-atmosphere-hd/atmosphere-ember.png",
  "quest-play": "/place-atmosphere-hd/atmosphere-supply.png",
  "npc-chat": "/place-atmosphere-hd/atmosphere-lore.png",
  "hybrid-room": "/place-atmosphere-hd/atmosphere-spirit.png",
})

export const DEFAULT_ATMOSPHERE_IMAGE = "/place-atmosphere-hd/atmosphere-ember.png"

export const FALLBACK_ATMOSPHERE_IMAGES = Object.freeze([
  DEFAULT_ATMOSPHERE_IMAGE,
  "/place-atmosphere-hd/atmosphere-healing.png",
  "/place-atmosphere-hd/atmosphere-market.png",
  "/place-atmosphere-hd/atmosphere-lore.png",
  "/place-atmosphere-hd/atmosphere-grove.png",
  "/place-atmosphere-hd/atmosphere-spirit.png",
  "/place-atmosphere-hd/atmosphere-transit.png",
  "/place-atmosphere-hd/atmosphere-supply.png",
  "/place-atmosphere-hd/atmosphere-shrine.png",
  "/place-atmosphere-hd/atmosphere-judgement.png",
])

export const GENERIC_ATMOSPHERE_KEYS = new Set(["", "space", "lobby"])

export const SPACE_ATMOSPHERE_CONFIG = Object.freeze({
  byType: ATMOSPHERE_BY_TYPE,
  byLayout: ATMOSPHERE_BY_LAYOUT,
  defaultImage: DEFAULT_ATMOSPHERE_IMAGE,
  fallbackImages: FALLBACK_ATMOSPHERE_IMAGES,
  genericKeys: GENERIC_ATMOSPHERE_KEYS,
})

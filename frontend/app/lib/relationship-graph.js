export const RELATIONSHIP_NODE_TYPES = [
  { id: "space", label: "空间" },
  { id: "character", label: "角色" },
]

export const RELATIONSHIP_BEHAVIOR_TYPES = [
  { id: "friendly", label: "友好" },
  { id: "allied", label: "同盟" },
  { id: "neutral", label: "中立" },
  { id: "rival", label: "竞争" },
  { id: "hostile", label: "敌对" },
]

export const RELATIONSHIP_STRENGTH_PRESETS = [
  { id: "weak", label: "弱" },
  { id: "normal", label: "标准" },
  { id: "strong", label: "强" },
]

export const RELATIONSHIP_GOVERNANCE_MODES = [
  { id: "manual", label: "店主手动" },
  { id: "assisted", label: "辅助建议" },
  { id: "delegated_ai", label: "委托 AI" },
  { id: "system_ai", label: "系统 AI" },
]

export const RELATIONSHIP_EDGE_STATUSES = [
  { id: "pending", label: "待确认" },
  { id: "confirmed", label: "已确认" },
  { id: "rejected", label: "已拒绝" },
  { id: "disabled", label: "已停用" },
]

const NODE_TYPE_IDS = new Set(RELATIONSHIP_NODE_TYPES.map((item) => item.id))
const BEHAVIOR_TYPE_IDS = new Set(RELATIONSHIP_BEHAVIOR_TYPES.map((item) => item.id))
const STRENGTH_PRESET_IDS = new Set(RELATIONSHIP_STRENGTH_PRESETS.map((item) => item.id))
const GOVERNANCE_MODE_IDS = new Set(RELATIONSHIP_GOVERNANCE_MODES.map((item) => item.id))
const EDGE_STATUS_IDS = new Set(RELATIONSHIP_EDGE_STATUSES.map((item) => item.id))

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function metadataObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {}
}

function choose(value, allowed, fallback) {
  const normalized = text(value).toLowerCase().replaceAll("-", "_")
  return allowed.has(normalized) ? normalized : fallback
}

export function normalizeRelationshipNodeType(value, fallback = "space") {
  return choose(value, NODE_TYPE_IDS, fallback)
}

export function normalizeRelationshipBehaviorType(value, fallback = "friendly") {
  return choose(value, BEHAVIOR_TYPE_IDS, fallback)
}

export function normalizeRelationshipStrengthPreset(value, fallback = "normal") {
  return choose(value, STRENGTH_PRESET_IDS, fallback)
}

export function normalizeRelationshipGovernanceMode(value, fallback = "manual") {
  return choose(value, GOVERNANCE_MODE_IDS, fallback)
}

export function normalizeRelationshipEdgeStatus(value, fallback = "confirmed") {
  return choose(value, EDGE_STATUS_IDS, fallback)
}

export function normalizeRelationshipEdge(value = {}, defaults = {}) {
  const sourceSpaceId = text(value.source_space_id || defaults.source_space_id)
  const targetSpaceId = text(value.target_space_id || defaults.target_space_id)
  const sourceNodeType = normalizeRelationshipNodeType(value.source_node_type, defaults.source_node_type || "space")
  const targetNodeType = normalizeRelationshipNodeType(value.target_node_type, defaults.target_node_type || "space")
  return {
    id: text(value.id || defaults.id),
    source_owner_id: text(value.source_owner_id || defaults.source_owner_id),
    source_space_id: sourceSpaceId,
    source_node_type: sourceNodeType,
    source_node_id: text(value.source_node_id || defaults.source_node_id || (sourceNodeType === "space" ? sourceSpaceId : "")),
    target_owner_id: text(value.target_owner_id || defaults.target_owner_id),
    target_space_id: targetSpaceId,
    target_node_type: targetNodeType,
    target_node_id: text(value.target_node_id || defaults.target_node_id || (targetNodeType === "space" ? targetSpaceId : "")),
    behavior_type: normalizeRelationshipBehaviorType(value.behavior_type, defaults.behavior_type || "friendly"),
    display_name: text(value.display_name || defaults.display_name),
    description: text(value.description || defaults.description),
    strength_preset: normalizeRelationshipStrengthPreset(value.strength_preset, defaults.strength_preset || "normal"),
    status: normalizeRelationshipEdgeStatus(value.status, defaults.status || "confirmed"),
    governance_mode: normalizeRelationshipGovernanceMode(value.governance_mode, defaults.governance_mode || "manual"),
    confirmed_by: text(value.confirmed_by || defaults.confirmed_by),
    confirmed_by_type: text(value.confirmed_by_type || defaults.confirmed_by_type || "owner"),
    perspective_scope: text(value.perspective_scope || defaults.perspective_scope || "source_owner"),
    created_at: text(value.created_at || defaults.created_at),
    updated_at: text(value.updated_at || defaults.updated_at),
    metadata: metadataObject(value.metadata || defaults.metadata),
  }
}

export function normalizeRelationshipEdgeDraft(value = {}, options = {}) {
  const draft = normalizeRelationshipEdge(value, options)
  const fallbackSourceCharacterId = text(options.fallback_source_character_id)
  if (draft.source_node_type === "space") {
    draft.source_node_id = draft.source_space_id
  } else if (!draft.source_node_id) {
    draft.source_node_id = fallbackSourceCharacterId
  }
  if (draft.target_node_type === "space") {
    draft.target_node_id = draft.target_space_id
  }
  return draft
}

export function createRelationshipEdgeDraftSeed(space = {}, characters = []) {
  const spaceId = text(space.id)
  const firstCharacterId = Array.isArray(characters) ? text(characters[0]?.id) : ""
  return normalizeRelationshipEdgeDraft(
    {
      source_space_id: spaceId,
      source_node_type: firstCharacterId ? "character" : "space",
      source_node_id: firstCharacterId || spaceId,
      target_space_id: "",
      target_node_type: "space",
      target_node_id: "",
      behavior_type: "friendly",
      display_name: "",
      description: "",
      strength_preset: "normal",
      status: "confirmed",
      governance_mode: "manual",
      confirmed_by_type: "owner",
    },
    {
      source_space_id: spaceId,
      fallback_source_character_id: firstCharacterId,
    },
  )
}

export function normalizeRelationshipEdges(value, defaults = {}) {
  return Array.isArray(value) ? value.map((item) => normalizeRelationshipEdge(item, defaults)) : []
}

export function relationshipOptionLabel(options, value, fallback = "") {
  return options.find((item) => item.id === value)?.label || fallback || value || ""
}

export function isCrossOwnerRelationshipPerspective(edge, ownerId = "") {
  const currentOwnerId = text(ownerId)
  if (!currentOwnerId) return false
  return text(edge?.target_owner_id) !== "" && text(edge?.target_owner_id) !== currentOwnerId
}

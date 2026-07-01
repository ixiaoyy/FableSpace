import { normalizePlaceTypeId } from "./place-types.js"

const HOME_MEMBER_TYPES = new Set(["conversational_character", "silent_member", "display_object"])
export const PLACE_RELATIONSHIP_TYPES = [
  { id: "school_enrollment", label: "学生-学校" },
  { id: "care_link", label: "照护 / 托管" },
  { id: "membership", label: "成员归属" },
  { id: "work_affiliation", label: "工作 / 志愿关系" },
  { id: "story_link", label: "故事关联" },
]

const PLACE_RELATIONSHIP_TYPE_IDS = new Set(PLACE_RELATIONSHIP_TYPES.map((type) => type.id))

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function numberOrZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeHomeAccess(value) {
  const access = text(value).toLowerCase()
  return access === "password" || access === "private" ? access : "private"
}

export function normalizeHomeMemberDraft(value = {}) {
  const memberType = HOME_MEMBER_TYPES.has(text(value.member_type).toLowerCase())
    ? text(value.member_type).toLowerCase()
    : "silent_member"
  const name = text(value.name || value.display_name)
  const draft = {
    name,
    display_name: text(value.display_name || name),
    member_type: memberType,
    speech_mode: memberType === "conversational_character" ? "character" : memberType === "display_object" ? "display" : "silent",
    description: text(value.description),
    avatar: text(value.avatar),
  }
  const characterId = text(value.character_id)
  if (memberType === "conversational_character" && characterId) {
    draft.character_id = characterId
  }
  return draft
}

export function normalizeCreatePlacePayload(value = {}) {
  const placeType = normalizePlaceTypeId(value.place_type)
  const payload = {
    ...value,
    name: text(value.name) || "未命名空间",
    description: text(value.description),
    lat: numberOrZero(value.lat),
    lon: numberOrZero(value.lon),
    address: text(value.address),
    access: text(value.access || "public") || "public",
    place_type: placeType,
  }
  if (placeType === "home") {
    payload.access = normalizeHomeAccess(value.access)
  }
  return payload
}

export function normalizePlaceRelationshipType(value) {
  const relationType = text(value).toLowerCase().replaceAll("-", "_")
  return PLACE_RELATIONSHIP_TYPE_IDS.has(relationType) ? relationType : "school_enrollment"
}

export function normalizePlaceRelationshipDraft(value = {}) {
  const targetSpaceId = text(value.target_space_id || value.school_space_id)
  const relationType = normalizePlaceRelationshipType(value.relation_type)
  const draft = {
    member_id: text(value.member_id || value.source_member_id),
    target_space_id: targetSpaceId,
    relation_type: relationType,
    display_name: text(value.display_name),
    source_role: text(value.source_role),
    target_role: text(value.target_role),
    note: text(value.note),
  }
  if (relationType === "school_enrollment") {
    draft.school_space_id = targetSpaceId
  }
  return draft
}

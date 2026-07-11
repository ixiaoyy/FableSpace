import { getAffinityStageMeta } from "./affinity.js"
import { WEB_PATHS } from "./web-routes"

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function timestampValue(value) {
  if (!value) return 0
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function visitorKey(visitor = {}) {
  return String(visitor.visitor_id || visitor.visitor_name || `${visitor.space_id || "space"}:anonymous`)
}

export function formatOwnerSummaryTime(value) {
  if (!value) return "暂无记录"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRelationshipStage(stage, strength = 0) {
  return getAffinityStageMeta(stage, strength).name_zh
}

export function getOwnerVisitorLabel(visitor = {}) {
  return visitor.visitor_name || (visitor.visitor_id ? String(visitor.visitor_id).slice(0, 16) : "匿名访客")
}

export function getOwnerSessionVisitorLabel(session = {}) {
  return session.visitor_name || (session.visitor_id ? String(session.visitor_id).slice(0, 16) : "匿名访客")
}

function summarizeReturningVisitors(visitors) {
  return visitors
    .filter((visitor) => toNumber(visitor.visit_count) >= 2)
    .map((visitor) => {
      const relationship = visitor.relationship && typeof visitor.relationship === "object" ? visitor.relationship : {}
      return {
        spaceId: String(visitor.space_id || ""),
        spaceName: visitor.space_name || visitor.space_id || "未知空间",
        visitorId: String(visitor.visitor_id || ""),
        visitorLabel: getOwnerVisitorLabel(visitor),
        visitCount: toNumber(visitor.visit_count),
        messageCount: toNumber(visitor.message_count),
        relationshipStage: String(relationship.stage || ""),
        relationshipLabel: formatRelationshipStage(relationship.stage, relationship.strength),
        relationshipStrength: toNumber(relationship.strength),
        lastVisit: visitor.last_visit || "",
      }
    })
    .sort((a, b) => (
      b.visitCount - a.visitCount
      || b.messageCount - a.messageCount
      || timestampValue(b.lastVisit) - timestampValue(a.lastVisit)
      || a.visitorLabel.localeCompare(b.visitorLabel)
    ))
}

function summarizeRecentSessions(sessions) {
  return sessions
    .map((session) => ({
      spaceId: String(session.space_id || ""),
      spaceName: session.space_name || session.space_id || "未知空间",
      visitorId: String(session.visitor_id || ""),
      visitorLabel: getOwnerSessionVisitorLabel(session),
      characterId: String(session.character_id || ""),
      characterName: session.character_name || session.character_id || "NPC",
      messageCount: toNumber(session.message_count),
      lastMessage: String(session.last_message || ""),
      lastRole: String(session.last_role || ""),
      updatedAt: session.updated_at || "",
    }))
    .sort((a, b) => timestampValue(b.updatedAt) - timestampValue(a.updatedAt))
}

function summarizeVisitorNotes(notes) {
  return notes
    .map((note) => ({
      noteId: String(note.id || ""),
      spaceId: String(note.space_id || ""),
      spaceName: note.space_name || note.space_id || "未知空间",
      visitorId: String(note.visitor_id || ""),
      visitorLabel: note.visitor_nickname || (note.visitor_id ? String(note.visitor_id).slice(0, 16) : "匿名访客"),
      content: String(note.content || ""),
      createdAt: note.created_at || "",
      visibility: note.visibility || "owner_only",
    }))
    .sort((a, b) => (
      timestampValue(b.createdAt) - timestampValue(a.createdAt)
      || a.visitorLabel.localeCompare(b.visitorLabel)
    ))
}

function summarizeSpaces(spaces, visitors, sessions) {
  return spaces
    .map((space) => {
      const spaceId = String(space.id || "")
      const spaceVisitors = visitors.filter((visitor) => visitor.space_id === spaceId)
      const spaceSessions = sessions.filter((session) => session.space_id === spaceId)
      const returningVisitorCount = spaceVisitors.filter((visitor) => toNumber(visitor.visit_count) >= 2).length
      const messageCount = spaceSessions.reduce((sum, session) => sum + toNumber(session.message_count), 0)
      const score = spaceVisitors.length * 2 + returningVisitorCount * 3 + spaceSessions.length + messageCount / 10
      return {
        spaceId,
        spaceName: space.name || spaceId || "未命名空间",
        status: space.status || "unknown",
        access: space.access || "public",
        visitorCount: spaceVisitors.length,
        returningVisitorCount,
        sessionCount: spaceSessions.length,
        messageCount,
        score,
      }
    })
    .sort((a, b) => (
      b.score - a.score
      || b.returningVisitorCount - a.returningVisitorCount
      || b.messageCount - a.messageCount
      || a.spaceName.localeCompare(b.spaceName)
    ))
}

function buildNextActions(metrics, spaces, returningHighlights, latestFeedback) {
  const actions = []
  const closedCount = spaces.filter((space) => space.status === "closed").length

  if (metrics.spaces === 0) {
    actions.push({
      kind: "create_first_space",
      title: "先开出第一间空间",
      detail: "创建一间真实坐标锚定的空间，让发现页有第一个可进入入口。",
      to: WEB_PATHS.createSpace,
    })
    return actions
  }

  if (returningHighlights.length > 0) {
    const first = returningHighlights[0]
    actions.push({
      kind: "follow_up_returning",
      title: "回应正在形成关系的回访者",
      detail: `${first.visitorLabel} 已回访 ${first.visitCount} 次，可以先查看最近会话，确认 NPC 是否延续了关系。`,
      spaceId: first.spaceId,
    })
  }

  if (!metrics.llmConfigured) {
    actions.push({
      kind: "configure_owner_llm",
      title: "检查店主默认 AI 配置",
      detail: "默认 AI 未配置或不可确认。AI 草稿只是辅助，保存发布仍需要店主确认。",
      to: WEB_PATHS.createSpace,
    })
  }

  if (latestFeedback.length > 0) {
    const firstNote = latestFeedback[0]
    actions.push({
      kind: "review_owner_visible_feedback",
      title: "处理访客给店主的反馈",
      detail: `${firstNote.visitorLabel} 留下了私密反馈：${firstNote.content.slice(0, 28)}${firstNote.content.length > 28 ? "…" : ""}`,
      spaceId: firstNote.spaceId,
    })
  }

  if (closedCount > 0) {
    actions.push({
      kind: "reopen_closed",
      title: "检查歇业空间",
      detail: `${closedCount} 间空间当前歇业。优先确认 LLM 配置或手动开放状态，避免访客进门即流失。`,
    })
  }

  if (metrics.sessions === 0) {
    actions.push({
      kind: "invite_first_visitor",
      title: "让第一个访客完成对话",
      detail: "当前还没有会话记录。可以从发现页进入自己的公开空间，验证首句问候和 NPC 回复。",
      to: WEB_PATHS.spaces,
    })
  }

  if (actions.length === 0) {
    actions.push({
      kind: "review_recent_sessions",
      title: "复盘最近会话",
      detail: "查看最近会话和回访者，找出值得强化的 NPC 关系线索。",
    })
  }

  return actions.slice(0, 4)
}

export function buildOwnerOperatingSummary({
  spaces = [],
  visitors = [],
  sessions = [],
  visitorNotes = [],
  ownerLLM = null,
} = {}) {
  const safeSpaces = asArray(spaces)
  const safeVisitors = asArray(visitors)
  const safeSessions = asArray(sessions)
  const safeVisitorNotes = asArray(visitorNotes)
  const latestFeedback = summarizeVisitorNotes(safeVisitorNotes)
  const uniqueVisitorKeys = new Set(safeVisitors.map(visitorKey))
  const returningHighlights = summarizeReturningVisitors(safeVisitors)
  const recentSessions = summarizeRecentSessions(safeSessions)
  const spaceHighlights = summarizeSpaces(safeSpaces, safeVisitors, safeSessions)
  const llmConfig = ownerLLM && typeof ownerLLM === "object" ? ownerLLM : {}
  const llmSafeConfig = llmConfig.llm_config && typeof llmConfig.llm_config === "object" ? llmConfig.llm_config : {}
  const llmConfigured = Boolean(llmConfig.configured || llmSafeConfig.api_key_configured)
  const metrics = {
    spaces: safeSpaces.length,
    openSpaces: safeSpaces.filter((space) => space.status === "open").length,
    visitors: uniqueVisitorKeys.size,
    visits: safeVisitors.reduce((sum, visitor) => sum + toNumber(visitor.visit_count), 0),
    returningVisitors: returningHighlights.length,
    engagedVisitors: safeVisitors.filter((visitor) => toNumber(visitor.message_count) > 0).length,
    sessions: safeSessions.length,
    messages: safeSessions.reduce((sum, session) => sum + toNumber(session.message_count), 0),
    visitorNotes: safeVisitorNotes.length,
    llmConfigured,
    llmBackend: llmSafeConfig.backend || "",
    llmModel: llmSafeConfig.model || "",
  }

  return {
    metrics,
    returningHighlights: returningHighlights.slice(0, 5),
    recentSessions: recentSessions.slice(0, 5),
    latestFeedback: latestFeedback.slice(0, 5),
    spaceHighlights: spaceHighlights.slice(0, 5),
    nextActions: buildNextActions(metrics, safeSpaces, returningHighlights, latestFeedback),
  }
}

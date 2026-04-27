const RELATIONSHIP_STAGE_LABELS = {
  stranger: "初访者",
  acquaintance: "熟面孔",
  regular: "常客",
  confidant: "熟客盟友",
}

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
  return String(visitor.visitor_id || visitor.visitor_name || `${visitor.tavern_id || "tavern"}:anonymous`)
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

export function formatRelationshipStage(stage) {
  return RELATIONSHIP_STAGE_LABELS[stage] || stage || "未建立"
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
        tavernId: String(visitor.tavern_id || ""),
        tavernName: visitor.tavern_name || visitor.tavern_id || "未知酒馆",
        visitorId: String(visitor.visitor_id || ""),
        visitorLabel: getOwnerVisitorLabel(visitor),
        visitCount: toNumber(visitor.visit_count),
        messageCount: toNumber(visitor.message_count),
        relationshipStage: String(relationship.stage || ""),
        relationshipLabel: formatRelationshipStage(relationship.stage),
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
      tavernId: String(session.tavern_id || ""),
      tavernName: session.tavern_name || session.tavern_id || "未知酒馆",
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

function summarizeTaverns(taverns, visitors, sessions) {
  return taverns
    .map((tavern) => {
      const tavernId = String(tavern.id || "")
      const tavernVisitors = visitors.filter((visitor) => visitor.tavern_id === tavernId)
      const tavernSessions = sessions.filter((session) => session.tavern_id === tavernId)
      const returningVisitorCount = tavernVisitors.filter((visitor) => toNumber(visitor.visit_count) >= 2).length
      const messageCount = tavernSessions.reduce((sum, session) => sum + toNumber(session.message_count), 0)
      const score = tavernVisitors.length * 2 + returningVisitorCount * 3 + tavernSessions.length + messageCount / 10
      return {
        tavernId,
        tavernName: tavern.name || tavernId || "未命名酒馆",
        status: tavern.status || "unknown",
        access: tavern.access || "public",
        visitorCount: tavernVisitors.length,
        returningVisitorCount,
        sessionCount: tavernSessions.length,
        messageCount,
        score,
      }
    })
    .sort((a, b) => (
      b.score - a.score
      || b.returningVisitorCount - a.returningVisitorCount
      || b.messageCount - a.messageCount
      || a.tavernName.localeCompare(b.tavernName)
    ))
}

function buildNextActions(metrics, taverns, returningHighlights) {
  const actions = []
  const closedCount = taverns.filter((tavern) => tavern.status === "closed").length

  if (metrics.taverns === 0) {
    actions.push({
      kind: "create_first_tavern",
      title: "先开出第一间酒馆",
      detail: "创建一间真实坐标锚定的酒馆，让发现页有第一个可进入入口。",
      to: "/create",
    })
    return actions
  }

  if (returningHighlights.length > 0) {
    const first = returningHighlights[0]
    actions.push({
      kind: "follow_up_returning",
      title: "回应正在形成关系的回访者",
      detail: `${first.visitorLabel} 已回访 ${first.visitCount} 次，可以先查看最近会话，确认 NPC 是否延续了关系。`,
      tavernId: first.tavernId,
    })
  }

  if (closedCount > 0) {
    actions.push({
      kind: "reopen_closed",
      title: "检查歇业酒馆",
      detail: `${closedCount} 间酒馆当前歇业。优先确认 LLM 配置或手动开放状态，避免访客进门即流失。`,
    })
  }

  if (metrics.sessions === 0) {
    actions.push({
      kind: "invite_first_visitor",
      title: "让第一个访客完成对话",
      detail: "当前还没有会话记录。可以从发现页进入自己的公开酒馆，验证首句问候和 NPC 回复。",
      to: "/discover",
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

export function buildOwnerOperatingSummary({ taverns = [], visitors = [], sessions = [] } = {}) {
  const safeTaverns = asArray(taverns)
  const safeVisitors = asArray(visitors)
  const safeSessions = asArray(sessions)
  const uniqueVisitorKeys = new Set(safeVisitors.map(visitorKey))
  const returningHighlights = summarizeReturningVisitors(safeVisitors)
  const recentSessions = summarizeRecentSessions(safeSessions)
  const tavernHighlights = summarizeTaverns(safeTaverns, safeVisitors, safeSessions)
  const metrics = {
    taverns: safeTaverns.length,
    openTaverns: safeTaverns.filter((tavern) => tavern.status === "open").length,
    visitors: uniqueVisitorKeys.size,
    visits: safeVisitors.reduce((sum, visitor) => sum + toNumber(visitor.visit_count), 0),
    returningVisitors: returningHighlights.length,
    engagedVisitors: safeVisitors.filter((visitor) => toNumber(visitor.message_count) > 0).length,
    sessions: safeSessions.length,
    messages: safeSessions.reduce((sum, session) => sum + toNumber(session.message_count), 0),
  }

  return {
    metrics,
    returningHighlights: returningHighlights.slice(0, 5),
    recentSessions: recentSessions.slice(0, 5),
    tavernHighlights: tavernHighlights.slice(0, 5),
    nextActions: buildNextActions(metrics, safeTaverns, returningHighlights),
  }
}

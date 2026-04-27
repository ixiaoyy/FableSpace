import { formatRelationshipStage } from "./owner-summary.js"

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function tavernLabel(name) {
  const value = String(name || "").trim()
  return value ? `「${value}」` : "这间酒馆"
}

function isEstablishedStage(stage) {
  return Boolean(stage && stage !== "stranger")
}

export function formatRevisitTime(value) {
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

export function buildRevisitCue(visitorState, options = {}) {
  const state = asObject(visitorState)
  const relationship = asObject(state.relationship)
  const visitCount = Math.max(0, Math.floor(toNumber(state.visit_count)))
  const relationshipStage = String(relationship.stage || "")
  const relationshipStrength = clamp(toNumber(relationship.strength), 0, 1)
  const strengthPercent = Math.round(relationshipStrength * 100)
  const stageLabel = formatRelationshipStage(relationshipStage)
  const lastVisitLabel = formatRevisitTime(state.last_visit)
  const available = Boolean(
    visitCount > 0
      || state.visitor_id
      || state.tavern_id
      || relationshipStage
      || relationshipStrength > 0,
  )

  if (!available) {
    return {
      available: false,
      isReturning: false,
      title: "进入酒馆后建立回访状态",
      detail: "点击「进入酒馆」后，后端会返回这名访客与当前酒馆的关系状态。",
      stageLabel: "未建立",
      visitCount: 0,
      strengthPercent: 0,
      lastVisitLabel: "暂无记录",
      chips: ["未进入"],
      promptHint: "先点击「进入酒馆」，再开始和 NPC 对话。",
    }
  }

  const isReturning = visitCount >= 2 || isEstablishedStage(relationshipStage)
  const safeVisitCount = Math.max(1, visitCount)
  const label = tavernLabel(options.tavernName)
  const characterName = String(options.characterName || "").trim()
  const target = characterName || "NPC"

  return {
    available: true,
    isReturning,
    title: isReturning ? `欢迎回来，已第 ${safeVisitCount} 次到访${label}` : `第一次到访${label}`,
    detail: isReturning
      ? `本次入场已带回关系上下文，${target} 可以据此延续这名访客和酒馆之间的记忆线索。`
      : `本次入场已建立访客状态，继续与 ${target} 对话会让后续回访有可用关系上下文。`,
    stageLabel,
    visitCount: safeVisitCount,
    strengthPercent,
    lastVisitLabel,
    chips: [
      stageLabel,
      `${safeVisitCount} 次到访`,
      `关系 ${strengthPercent}%`,
      `最近 ${lastVisitLabel}`,
    ],
    promptHint: isReturning
      ? "继续沿着上次的话题、委托或情绪线索对话。"
      : "先打个招呼，完成第一轮对话后这段关系会继续沉淀。",
  }
}

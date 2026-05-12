/**
 * Social Memory Creation Panel
 *
 * Shows memories auto-created during the current chat session,
 * returned by the sendChat API as `created_memories`.
 *
 * Owner-only, visible when there are new memories or previous sessions.
 */

import { useState } from "react"
import type { NpcSocialMemory } from "../../lib/taverns"

// ── Scoring helpers (mirror of backend logic) ───────────────────────────────

type NgramSet = Set<string>

function extractNgrams(text: string, n = 2): NgramSet {
  const chars = [...text].filter((c) => !/\s/.test(c))
  if (chars.length < n) return new Set(chars)
  const grams = new Set<string>()
  for (let i = 0; i < chars.length - n + 1; i++) {
    grams.add(chars.slice(i, i + n).join(""))
  }
  return grams
}

function recencyBonus(timestamp: string): { label: string; score: number; color: string } {
  try {
    const ts = new Date(timestamp.replace("Z", "+00:00"))
    const now = new Date()
    const ageHours = (now.getTime() - ts.getTime()) / 3_600_000
    if (ageHours < 1) return { label: "< 1 小时", score: 4, color: "text-emerald-300" }
    if (ageHours < 24) return { label: "< 24 小时", score: 2, color: "text-cyan-300" }
    if (ageHours < 72) return { label: "< 72 小时", score: 1, color: "text-amber-300" }
    return { label: "已过期", score: 0, color: "text-white/30" }
  } catch {
    return { label: "无时间戳", score: 0, color: "text-white/30" }
  }
}

function memoryScore(memory: NpcSocialMemory, userMessage: string): {
  sourceMatch: number
  contentOverlap: number
  recency: { label: string; score: number; color: string }
  total: number
} {
  const userL = userMessage.toLowerCase()
  const source = (memory.source_name || "").toLowerCase()
  const sourceMatch = source && userL.includes(source) ? 10 : 0

  const content = (memory.content || "").toLowerCase()
  const contentNgrams = extractNgrams(content)
  const userNgrams = extractNgrams(userL)
  const overlap = [...contentNgrams].filter((g) => userNgrams.has(g))
  const contentOverlap = overlap.length * 5

  const recency = recencyBonus(memory.timestamp || "")

  return { sourceMatch, contentOverlap, recency, total: sourceMatch + contentOverlap + recency.score }
}

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts.replace("Z", "+00:00"))
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} 小时前`
    const diffDay = Math.floor(diffHr / 24)
    return `${diffDay} 天前`
  } catch {
    return ts
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

export type SocialMemoryDebugPanelProps = {
  /** All stored social memories for this NPC */
  storedMemories: NpcSocialMemory[]
  /** Memories created during this chat session */
  createdMemories: Array<{ content: string; source_name: string; timestamp: string }>
  /** Current user message (used for scoring simulation) */
  lastUserMessage: string
  /** Whether to show debug panel */
  visible: boolean
}

// ── Component ───────────────────────────────────────────────────────────────

export function SocialMemoryCreationPanel({
  storedMemories,
  createdMemories,
  lastUserMessage,
  visible,
}: SocialMemoryDebugPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [showCreated, setShowCreated] = useState(false)

  if (!visible) return null

  const scoredStored = storedMemories.map((m) => ({
    memory: m,
    score: memoryScore(m, lastUserMessage),
  }))
  scoredStored.sort((a, b) => b.score.total - a.score.total)

  return (
    <div data-social-memory-debug-panel="owner-only" className="rounded-2xl border border-violet-300/20 bg-violet-300/5 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-violet-100/80">
          🧠 社交记忆调试
          <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[0.65rem] font-bold">
            {storedMemories.length} 条存储 · {createdMemories.length} 条新建
          </span>
        </span>
        <span className="text-xs text-violet-100/50">{expanded ? "收起" : "展开"}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="rounded-xl border border-amber-300/18 bg-amber-300/[0.055] p-2 text-[0.7rem] leading-5 text-amber-50/70">
            根据当前输入预估来源名匹配、关键词/n-gram 重叠和时效性加分；后端仍是最终 prompt 注入来源。
            仅店主可见，用于解释 NPC 社交感知，不是访客公开八卦墙。
          </p>
          {/* ── Stored memories with scoring ───────────────────────────────── */}
          <div>
            <p className="mb-2 text-[0.7rem] font-bold text-violet-100/60">
              检索结果 (Top-3，基于当前消息评分)
            </p>
            {storedMemories.length === 0 ? (
              <p className="text-xs text-white/30">该 NPC 暂无社交记忆。</p>
            ) : (
              <div className="space-y-2">
                {scoredStored.map(({ memory, score }, i) => {
                  const isTop = i < 3
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        isTop
                          ? "border-cyan-300/25 bg-cyan-300/5"
                          : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-cyan-200">{memory.source_name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[0.65rem] text-white/30">
                            {score.sourceMatch > 0 && `来源匹配 +${score.sourceMatch}`}
                          </span>
                          <span className="text-[0.65rem] text-white/30">
                            {score.contentOverlap > 0 && `关键词 +${score.contentOverlap}`}
                          </span>
                          <span className={`text-[0.65rem] ${score.recency.color}`}>
                            时效 +{score.recency.score}
                          </span>
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                            isTop ? "bg-cyan-300/20 text-cyan-200" : "bg-white/10 text-white/30"
                          }`}>
                            {score.total.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 leading-5 text-violet-100/70">{memory.content}</p>
                      <p className="mt-1 text-[0.6rem] text-white/25">
                        {score.recency.label} · {formatTimestamp(memory.timestamp || "")}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Created memories ──────────────────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setShowCreated((v) => !v)}
              className="mb-2 text-[0.7rem] font-bold text-violet-100/60 hover:text-cyan-100"
            >
              本轮新建记忆 {createdMemories.length > 0 ? `(${createdMemories.length})` : ""}
              {createdMemories.length > 0 ? (showCreated ? " ▲" : " ▼") : ""}
            </button>
            {showCreated && createdMemories.length > 0 && (
              <div className="space-y-2">
                {createdMemories.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-emerald-300/25 bg-emerald-300/5 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-200">{m.source_name || "系统"}</span>
                      <span className="text-[0.6rem] text-white/25">{formatTimestamp(m.timestamp || "")}</span>
                    </div>
                    <p className="mt-1 leading-5 text-emerald-100/80">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
            {showCreated && createdMemories.length === 0 && (
              <p className="text-xs text-white/30">本轮对话尚未生成新记忆。</p>
            )}
          </div>

          {/* ── Scoring legend ──────────────────────────────────────────── */}
          <p className="text-[0.6rem] leading-4 text-white/20">
            计分规则：来源名匹配 +10 · 内容 n-gram 重叠每个 +5 · 时效加分 1h内+4/24h内+2/72h内+1 · 取 Top-3
          </p>
        </div>
      )}
    </div>
  )
}

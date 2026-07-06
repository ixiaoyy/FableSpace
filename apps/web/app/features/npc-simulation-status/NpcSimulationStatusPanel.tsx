/**
 * NPC Simulation Status Panel
 * 
 * Visualizes the Sims-style five-dimensional status (energy/hunger/thirst/social/entertainment),
 * mood indicator, personality traits, social memories, and mobility info for a single NPC.
 * 
 * Used in owner management view (full) and visitor view (compact).
 */

import { useState } from "react"
import type { SpaceCharacter, NpcSimulationState, NpcSocialMemory } from "../../lib/spaces"

// ── Status bar config ───────────────────────────────────────────────────────

type StatusDimension = {
  key: keyof Omit<NpcSimulationState, "mood" | "last_tick_at">
  label: string
  icon: string
  colorLow: string   // tailwind color when value is low
  colorMid: string
  colorHigh: string
}

const STATUS_DIMENSIONS: StatusDimension[] = [
  { key: "energy",        label: "体力",   icon: "⚡", colorLow: "bg-red-500",    colorMid: "bg-amber-400",   colorHigh: "bg-emerald-400" },
  { key: "hunger",        label: "饱腹",   icon: "🍚", colorLow: "bg-red-500",    colorMid: "bg-amber-400",   colorHigh: "bg-emerald-400" },
  { key: "thirst",        label: "水分",   icon: "💧", colorLow: "bg-red-500",    colorMid: "bg-sky-400",     colorHigh: "bg-emerald-400" },
  { key: "social",        label: "社交",   icon: "💬", colorLow: "bg-red-500",    colorMid: "bg-violet-400",  colorHigh: "bg-emerald-400" },
  { key: "entertainment", label: "娱乐",   icon: "🎮", colorLow: "bg-red-500",    colorMid: "bg-amber-400",   colorHigh: "bg-emerald-400" },
]

function statusColor(dim: StatusDimension, value: number): string {
  if (value < 30) return dim.colorLow
  if (value < 60) return dim.colorMid
  return dim.colorHigh
}

function statusLabel(value: number): string {
  if (value < 20) return "危急"
  if (value < 40) return "低"
  if (value < 60) return "中"
  if (value < 80) return "良好"
  return "充沛"
}

// ── Mood indicator ──────────────────────────────────────────────────────────

function moodEmoji(mood: number): string {
  if (mood >= 80) return "😊"
  if (mood >= 60) return "🙂"
  if (mood >= 40) return "😐"
  if (mood >= 20) return "😟"
  return "😢"
}

function moodLabel(mood: number): string {
  if (mood >= 80) return "非常开心"
  if (mood >= 60) return "心情不错"
  if (mood >= 40) return "平和"
  if (mood >= 20) return "有些低落"
  return "极度沮丧"
}

// ── Trait display ───────────────────────────────────────────────────────────

const TRAIT_DISPLAY: Record<string, { label: string; icon: string; desc: string }> = {
  workaholic:  { label: "工作狂",   icon: "💼", desc: "体力衰减慢，社交需求高" },
  glutton:     { label: "好吃鬼",   icon: "🍔", desc: "饱腹度衰减快，吃东西效果好" },
  socialite:   { label: "社交达人", icon: "🎉", desc: "社交需求旺盛" },
  loner:       { label: "宅",       icon: "🏠", desc: "社交需求低" },
  curious:     { label: "好奇心强", icon: "🔍", desc: "娱乐需求高" },
}

// ── Props ───────────────────────────────────────────────────────────────────

export type NpcSimulationStatusPanelProps = {
  character: SpaceCharacter
  /** "full" = owner management view with all details; "compact" = visitor-facing summary */
  variant?: "full" | "compact"
  /** Optional space name for mobility context */
  spaceName?: string
}

// ── Component ───────────────────────────────────────────────────────────────

export function NpcSimulationStatusPanel({
  character,
  variant = "full",
  spaceName,
}: NpcSimulationStatusPanelProps) {
  const [showMemories, setShowMemories] = useState(false)
  const state = character.simulation_state
  if (!state) return null

  const traits = character.traits ?? []
  const memories = character.social_memories ?? []
  const isCompact = variant === "compact"

  return (
    <div className="space-y-4" data-npc-simulation-panel={variant}>
      {/* ── Five-dimensional status bars ─────────────────────────────────── */}
      <div className="space-y-2.5">
        {STATUS_DIMENSIONS.map((dim) => {
          const value = state[dim.key] ?? 100
          const color = statusColor(dim, value)
          return (
            <div key={dim.key} className="flex items-center gap-2.5">
              <span className={isCompact ? "text-sm" : "text-sm"} title={dim.label}>
                {dim.icon}
              </span>
              <span className={isCompact ? "w-8 text-xs text-white/60" : "w-10 text-xs text-white/60"}>
                {dim.label}
              </span>
              <div className="relative min-w-0 flex-1">
                <div className={isCompact ? "h-2 overflow-hidden rounded-full bg-white/10" : "h-2.5 overflow-hidden rounded-full bg-white/10"}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
              </div>
              <span className={isCompact ? "w-7 text-right text-[0.65rem] text-white/50" : "w-10 text-right text-xs text-white/50"}>
                {Math.round(value)}
              </span>
              {!isCompact && (
                <span className="w-8 text-[0.65rem] text-white/40">{statusLabel(value)}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Mood indicator ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{moodEmoji(state.mood)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className={isCompact ? "text-xs text-white/70" : "text-sm text-white/80"}>
              心情 {moodLabel(state.mood)}
            </span>
            <span className="text-xs text-white/50">{Math.round(state.mood)}</span>
          </div>
          <div className={isCompact ? "mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" : "mt-1 h-2 overflow-hidden rounded-full bg-white/10"}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, state.mood))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Traits (personality) ─────────────────────────────────────────── */}
      {traits.length > 0 && (
        <div>
          <p className={isCompact ? "mb-1.5 text-xs text-white/50" : "mb-2 text-xs font-bold uppercase tracking-wider text-white/50"}>
            性格特质
          </p>
          <div className="flex flex-wrap gap-1.5">
            {traits.map((trait) => {
              const info = TRAIT_DISPLAY[trait]
              return (
                <span
                  key={trait}
                  title={info?.desc || trait}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/70"
                >
                  <span>{info?.icon || "✦"}</span>
                  <span>{info?.label || trait}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Mobility info (full variant only) ────────────────────────────── */}
      {!isCompact && (character.is_visitor || character.current_space_id !== character.home_space_id) && (
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
          <p className="text-xs font-bold text-cyan-100/80">🚶 流动中</p>
          <p className="mt-1 text-xs text-cyan-100/60">
            {character.is_visitor
              ? `作为外来访客在「${spaceName || character.current_space_id}」逗留`
              : `当前在「${spaceName || character.current_space_id}」`}
            {character.home_space_id ? `，锚点在 ${character.home_space_id}` : ""}
          </p>
        </div>
      )}

      {/* ── Social memories ─────────────────────────────────────────────── */}
      {memories.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowMemories((v) => !v)}
            className={isCompact ? "text-xs text-white/50 underline decoration-dotted underline-offset-2" : "text-xs font-bold text-white/50 underline decoration-dotted underline-offset-2"}
          >
            {showMemories ? "收起社交记忆" : `查看社交记忆 (${memories.length})`}
          </button>
          {showMemories && (
            <ul className="mt-2 space-y-1.5">
              {memories.map((mem, i) => (
                <li key={i} className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60">
                  <span className="font-medium text-white/70">{mem.source_name}</span>: {mem.content}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Last tick ────────────────────────────────────────────────────── */}
      {state.last_tick_at && !isCompact && (
        <p className="text-[0.6rem] text-white/30">
          最近一次仿真更新: {new Date(state.last_tick_at).toLocaleString("zh-CN")}
        </p>
      )}
    </div>
  )
}

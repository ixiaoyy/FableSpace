import { cn } from "../lib/utils"
import { getBondTypeMeta, type PublicBond } from "../lib/publicBond"

type BondBadgeProps = {
  bondType: string
  status?: string
  size?: "sm" | "default"
  className?: string
}

export function BondBadge({ bondType, status, size = "default", className }: BondBadgeProps) {
  const meta = getBondTypeMeta(bondType)
  const isPending = status === "pending"
  const isRevoked = status === "revoked" || status === "expired"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        isPending && "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        isRevoked && "bg-white/8 text-white/40 border border-white/10",
        !isPending && !isRevoked && toneClass(meta.tone, "bg", "text", "border"),
        className,
      )}
      title={`${meta.name_zh}（${meta.name_en}）${status ? "· " + statusLabel(status) : ""}`}
    >
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          !isPending && !isRevoked && toneClass(meta.tone, "bg", "", ""),
          isPending && "bg-amber-400 animate-pulse",
          isRevoked && "bg-white/30",
        )}
        aria-hidden="true"
      />
      <span>{meta.name_zh}</span>
    </span>
  )
}

// ─── Multiple bonds badge ──────────────────────────────────────────────────────

type BondBadgeListProps = {
  bonds: Array<{ bond_type: string; status: string }>
  limit?: number
  size?: "sm" | "default"
  className?: string
}

export function BondBadgeList({ bonds, limit = 3, size = "sm", className }: BondBadgeListProps) {
  const visible = bonds.slice(0, limit)
  const overflow = bonds.length - limit
  const active = bonds.filter((b) => b.status === "active")

  if (bonds.length === 0) return null

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {visible.map((bond) => (
        <BondBadge
          key={`${bond.bond_type}-${bond.status}`}
          bondType={bond.bond_type}
          status={bond.status}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50",
            size === "default" && "px-2.5 py-1 text-xs",
          )}
        >
          +{overflow}
        </span>
      )}
      {active.length > 0 && (
        <span className="ml-1 text-[10px] text-white/35">
          {active.length}段活跃关系
        </span>
      )}
    </span>
  )
}

// ─── Tonal dot for inline use ─────────────────────────────────────────────────

type BondDotProps = {
  bondType: string
  className?: string
}

export function BondDot({ bondType, className }: BondDotProps) {
  const meta = getBondTypeMeta(bondType)
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", toneClass(meta.tone, "bg", "", ""), className)}
      title={meta.name_zh}
      aria-label={meta.name_zh}
    />
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toneClass(
  tone: string,
  prefix: "bg" | "text" | "border",
  _suffix: string,
  fallback: string,
): string {
  const map: Record<string, Record<string, string>> = {
    rose: { bg: "bg-rose-400/25", text: "text-rose-300", border: "border-rose-500/40" },
    pink: { bg: "bg-pink-400/25", text: "text-pink-300", border: "border-pink-500/40" },
    blue: { bg: "bg-blue-400/25", text: "text-blue-300", border: "border-blue-500/40" },
    indigo: { bg: "bg-indigo-400/25", text: "text-indigo-300", border: "border-indigo-500/40" },
    violet: { bg: "bg-violet-400/25", text: "text-violet-300", border: "border-violet-500/40" },
    sky: { bg: "bg-sky-400/25", text: "text-sky-300", border: "border-sky-500/40" },
    teal: { bg: "bg-teal-400/25", text: "text-teal-300", border: "border-teal-500/40" },
    cyan: { bg: "bg-cyan-400/25", text: "text-cyan-300", border: "border-cyan-500/40" },
    emerald: { bg: "bg-emerald-400/25", text: "text-emerald-300", border: "border-emerald-500/40" },
    amber: { bg: "bg-amber-400/25", text: "text-amber-300", border: "border-amber-500/40" },
    orange: { bg: "bg-orange-400/25", text: "text-orange-300", border: "border-orange-500/40" },
    slate: { bg: "bg-slate-400/25", text: "text-slate-300", border: "border-slate-500/40" },
  }
  return map[tone]?.[prefix] ?? fallback
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "待审批",
    active: "已结缘",
    revoked: "已撤销",
    expired: "已过期",
  }
  return map[status] ?? status
}

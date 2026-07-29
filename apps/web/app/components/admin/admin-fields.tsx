import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

export function Field({
  label,
  children,
  wide,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`admin-field${wide ? " is-wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function ItemActions({
  index,
  length,
  onMove,
  onDelete,
}: {
  index: number
  length: number
  onMove: (from: number, to: number) => void
  onDelete: () => void
}) {
  return (
    <div
      className="admin-item-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        aria-label="上移"
        className="admin-icon-button"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        type="button"
      >
        <ChevronUp aria-hidden="true" size={16} />
      </button>
      <button
        aria-label="下移"
        className="admin-icon-button"
        disabled={index === length - 1}
        onClick={() => onMove(index, index + 1)}
        type="button"
      >
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      <button
        aria-label="删除"
        className="admin-icon-button is-danger"
        onClick={onDelete}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} />
      </button>
    </div>
  )
}

export function NumberInput({
  value,
  onCommit,
  ariaLabel,
  step = "1",
}: {
  value: number
  onCommit: (value: number) => void
  ariaLabel?: string
  step?: string
}) {
  return (
    <input
      aria-label={ariaLabel}
      defaultValue={value}
      key={value}
      onBlur={(event) => {
        const rawValue = event.currentTarget.value.trim()
        const nextValue = rawValue ? Number(rawValue) : Number.NaN
        if (!Number.isFinite(nextValue)) {
          event.currentTarget.value = String(value)
          return
        }
        onCommit(nextValue)
      }}
      step={step}
      type="number"
    />
  )
}

export function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) {
    return items
  }
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function newContentId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now()}`
  return `${prefix}_${suffix}`
}

export function joinLines(values: string[]) {
  return values.join("\n")
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function joinFlags(values: string[]) {
  return values.join(", ")
}

export function splitFlags(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

import type { Space } from "../lib/spaces"
import { buildDiscoveryLiveliness } from "../lib/discovery-liveliness.js"

type DiscoveryLivelinessStripProps = {
  space: Space
  compact?: boolean
  muted?: boolean
}

export function DiscoveryLivelinessStrip({
  space,
  compact = false,
  muted = false,
}: DiscoveryLivelinessStripProps) {
  const liveliness = buildDiscoveryLiveliness(space)
  const chips = compact ? liveliness.chips.slice(0, 3) : liveliness.chips

  return (
    <div className="flex flex-wrap gap-2" aria-label="发现页空间活性">
      <span
        className={`inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-black ${
          muted
            ? "border-white/10 bg-white/[0.035] text-white/36"
            : "border-emerald-300/24 bg-emerald-300/10 text-emerald-50"
        }`}
        title={liveliness.summary}
      >
        {liveliness.headline}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={`inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
            muted ? "border-white/10 bg-white/[0.035] text-white/32" : chip.className
          }`}
          title={chip.helper}
        >
          {chip.value}
        </span>
      ))}
    </div>
  )
}

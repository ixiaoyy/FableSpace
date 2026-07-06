import { DoorOpen, Eye, MapPinned, Users, X } from "lucide-react"
import { Link } from "react-router"

import { derivePlaceTypeDisplay } from "../lib/place-types.js"
import { buildSpaceFirstMinuteGuide } from "../lib/space-first-minute"
import { type Space, type SpaceCharacter } from "../lib/spaces"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"

type SpacePreviewModalProps = {
  space: Space | null
  onClose: () => void
}

function characterAvatar(character: SpaceCharacter) {
  if (!character) return ""
  return (
    character.sprites?.neutral
    || character.avatar
    || character.image_url
    || Object.values(character.sprites || {}).find(Boolean)
    || ""
  )
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

function worldInfoPreview(space: Space) {
  const entries = Array.isArray(space.world_info) ? space.world_info : []
  return entries.slice(0, 4).map((entry: unknown, index: number) => {
    const record = entry as Record<string, unknown>
    const keys = Array.isArray(record.keys) ? record.keys.filter((key): key is string => typeof key === "string") : []
    return {
      title: keys[0] || `记忆片段 ${index + 1}`,
      text: typeof record.content === "string" ? record.content.slice(0, 60) + "..." : "店主还没有写下这条世界知识内容。",
      tag: keys[1] || "世界书",
    }
  })
}

export function SpacePreviewModal({ space, onClose }: SpacePreviewModalProps) {
  if (!space) return null

  const characters = Array.isArray(space.characters) ? space.characters : []
  const worldInfoEntries = worldInfoPreview(space)
  const scenePrompt = space.scene_prompt || "店主还没有写下场景提示。"
  const placeType = derivePlaceTypeDisplay(space)
  const firstMinute = buildSpaceFirstMinuteGuide(space)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[90vh] min-w-0 max-w-2xl overflow-y-auto rounded-[2rem] border border-white/12 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/95 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-100/70">空间预览</p>
              <h2 className="font-black text-white">{space.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-violet-100/70 transition hover:border-rose-300/40 hover:text-rose-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-5">
          {/* Description */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm leading-6 text-violet-50/74">
              {space.description || "店主还没有写下空间简介。"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-violet-100/45">
              <span className="inline-flex items-center gap-1">
                <MapPinned className="h-3.5 w-3.5" />
                {Number(space.lat).toFixed(4)}, {Number(space.lon).toFixed(4)}
              </span>
              <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-0.5 text-cyan-100">
                <span aria-hidden="true">{placeType.icon}</span> {placeType.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                {space.access || "public"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                {space.status || "unknown"}
              </span>
            </div>
          </div>

          {/* First-minute guide */}
          <div data-first-minute-guide="preview-modal" className="rounded-3xl border border-cyan-300/18 bg-cyan-300/8 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-cyan-100/70">这里有什么</p>
                <h3 className="mt-1 font-black text-white">{firstMinute.sceneHint}</h3>
              </div>
              <span className="w-fit rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-50">
                {firstMinute.anchorLine}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {firstMinute.tryThisFirst.map((prompt) => (
                <p key={prompt} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-violet-50/70">
                  {prompt}
                </p>
              ))}
            </div>
          </div>

          {/* Scene prompt */}
          <div className="rounded-3xl border border-amber-300/18 bg-amber-300/8 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-100/70">场景氛围</p>
            <p className="mt-2 text-sm leading-6 text-violet-50/74">{scenePrompt}</p>
          </div>

          {/* Characters */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-200" />
              <p className="text-sm font-black text-white">角色列表 ({characters.length})</p>
            </div>
            {characters.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {characters.map((character, index) => {
                  const avatar = characterAvatar(character)
                  return (
                    <div
                      key={character.id || index}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={character.name || "角色"}
                          className="h-14 w-14 shrink-0 rounded-xl border border-white/12 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-lg font-black text-white">
                          {initialFor(character.name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-white">{character.name || "未命名角色"}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-violet-100/60">
                          {character.description || character.personality || character.first_mes || "暂无简介"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/60">
                这间空间还没有 NPC。店主添加角色卡后会显示在这里。
              </p>
            )}
          </div>

          {/* World Info */}
          {worldInfoEntries.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-black text-white">世界观 / 记忆片段</p>
              <div className="grid gap-2">
                {worldInfoEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <span className="shrink-0 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-100">
                      {entry.tag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{entry.title}</p>
                      <p className="mt-1 text-xs leading-5 text-violet-100/60">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-white/10 bg-slate-950/95 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-violet-100/55">预览内容仅展示公开信息</p>
            <Button asChild>
              <Link to={`/space/${encodeURIComponent(space.id)}`} onClick={onClose}>
                <DoorOpen className="h-4 w-4" />
                进入空间
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Standalone preview card for use in lists
type SpacePreviewCardProps = {
  space: Space
  onPreview: (space: Space) => void
  className?: string
}

export function SpacePreviewCard({ space, onPreview, className }: SpacePreviewCardProps) {
  const characters = Array.isArray(space.characters) ? space.characters : []

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {characters.slice(0, 3).map((character, index) => {
        const avatar = characterAvatar(character)
        return avatar ? (
          <img
            key={character.id || index}
            src={avatar}
            alt={character.name || "角色"}
            className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            key={character.id || index}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-xs font-bold text-white"
          >
            {initialFor(character.name)}
          </span>
        )
      })}
      {characters.length > 3 && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-bold text-violet-100">
          +{characters.length - 3}
        </span>
      )}
      <button
        type="button"
        onClick={() => onPreview(space)}
        className="ml-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 p-1.5 text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/20"
        title="预览空间"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

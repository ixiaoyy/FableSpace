import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Globe, MapPinned, Store, Users, Sparkles } from "lucide-react"
import { Link, replace, useLoaderData } from "react-router"
import { useMemo, useState } from "react"

import { SpacePreviewModal } from "../components/space-preview-modal"
import { mediaAssetUrl } from "../lib/media-assets"
import { DEFAULT_OWNER_ID, errorMessage, listSpaces, type Space, type SpaceCharacter, type SpaceListResponse } from "../lib/spaces"
import { matchesPublicReference, ownerProfilePath, redirectPathForRequest, WEB_PATHS } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

const spaceNeonImage = mediaAssetUrl("app/assets/fable-space-05-10/discover/cards/card-sky-city-square.png")
const spaceNightImage = mediaAssetUrl("app/assets/fable-space-05-10/home-black/hero-system-visual.webp")

// Helper functions for character rendering
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

type CreatorLoaderData = {
  ownerId: string
  result: SpaceListResponse
  error: string
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<CreatorLoaderData> {
  const ownerRef = params.ownerRef || ""
  if (!ownerRef) {
    return { ownerId: DEFAULT_OWNER_ID, result: { spaces: [], count: 0 }, error: "缺少店主引用" }
  }

  try {
    const allSpaces = await listSpaces()
    const ownerIds = Array.from(new Set(
      (allSpaces.spaces || []).map((space) => space.owner_id || "").filter(Boolean)
    ))
    const matches = ownerIds.filter((ownerId) => (
      matchesPublicReference(ownerRef, "owner", ownerId)
    ))
    if (matches.length !== 1) {
      const error = matches.length > 1 ? "店主公开引用发生冲突" : "未找到目标店主"
      return { ownerId: "", result: { spaces: [], count: 0 }, error }
    }

    const ownerId = matches[0]
    const spaces = (allSpaces.spaces || []).filter(
      (space) => space.owner_id === ownerId
    )
    const url = new URL(request.url)
    const canonicalPath = ownerProfilePath(ownerId)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }

    return { ownerId, result: { ...allSpaces, spaces, count: spaces.length }, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { ownerId: "", result: { spaces: [], count: 0 }, error: errorMessage(error) }
  }
}

export default function CreatorRoute() {
  const { ownerId, result, error } = useLoaderData<typeof clientLoader>()
  const [previewSpace, setPreviewSpace] = useState<Space | null>(null)

  const stats = useMemo(() => {
    const spaces = result.spaces || []
    const totalCharacters = spaces.reduce((sum, t) => sum + (t.characters?.length || 0), 0)
    const totalVisitors = spaces.reduce((sum, t) => sum + (t.visit_count || 0), 0)
    const openSpaces = spaces.filter((t) => t.status === "open").length
    return {
      spaceCount: spaces.length,
      characterCount: totalCharacters,
      visitorCount: totalVisitors,
      openCount: openSpaces,
    }
  }, [result.spaces])

  return (
    <ProductShell eyebrow="创作者">
      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Creator profile card */}
          <div className="rounded-[2rem] border border-theme-accent-border bg-theme-card p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-bg px-3 py-1.5 text-xs font-black text-theme-primary">
              <Sparkles className="h-3.5 w-3.5" />
              公开主页
            </div>

            {/* Creator avatar */}
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-theme-accent-border bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-3xl font-black text-theme-primary">
                {ownerId.trim().slice(0, 1).toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="text-2xl font-black text-theme-primary">创作者 #{ownerId.slice(0, 8)}</h1>
                <p className="mt-1 text-sm text-theme-muted">在 FableSpace 创作空间</p>
              </div>
            </div>

            <p className="text-sm leading-7 text-theme-muted">
              这位创作者在 FableSpace 平台开设了 {stats.spaceCount} 间空间，
              创作了 {stats.characterCount} 位 NPC，
              累计接待了 {stats.visitorCount} 位访客。
            </p>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-theme-border bg-theme-card p-3 text-center">
                <p className="text-2xl font-black text-theme-primary">{stats.spaceCount}</p>
                <p className="mt-1 text-xs text-theme-muted">空间</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-3 text-center">
                <p className="text-2xl font-black text-theme-primary">{stats.characterCount}</p>
                <p className="mt-1 text-xs text-theme-muted">NPC</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-3 text-center">
                <p className="text-2xl font-black text-theme-primary">{stats.visitorCount}</p>
                <p className="mt-1 text-xs text-theme-muted">访客</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-3 text-center">
                <p className="text-2xl font-black text-theme-primary">{stats.openCount}</p>
                <p className="mt-1 text-xs text-theme-muted">营业中</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Button asChild>
                <Link to={WEB_PATHS.spaces}>
                  <Globe className="h-4 w-4" />
                  浏览全部空间
                </Link>
              </Button>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid gap-4 sm:grid-cols-1">
            {[
              { image: spaceNightImage, title: "探索空间", text: "从真实坐标进入店主创作的空间，和 NPC 对话。" },
              { image: spaceNeonImage, title: "成为创作者", text: "在地图上开设自己的空间，创作独特的角色和故事。" },
            ].map((card) => (
              <article key={card.title} className="overflow-hidden rounded-[1.75rem] border border-theme-border bg-theme-card">
                <img src={card.image} alt="" className="h-36 w-full object-cover" loading="lazy" decoding="async" />
                <div className="p-4">
                  <h2 className="font-black text-theme-primary">{card.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-theme-muted">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <section className="relative min-h-[620px] overflow-hidden rounded-[2.2rem] border border-theme-border bg-theme-card p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(244,114,182,0.24),transparent_17rem),radial-gradient(circle_at_74%_68%,rgba(217,70,239,0.20),transparent_20rem)]" />
          <div className="absolute inset-5 rounded-[1.8rem] border border-theme-accent-border bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-theme-border bg-theme-card p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-theme-accent-text">创作者的空间</p>
                <h2 className="mt-2 text-3xl font-black text-theme-primary">创作者的空间</h2>
                <p className="mt-1 text-sm text-theme-muted">
                  {result.count} 间空间 · 点击预览 · 进入对话
                </p>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-full border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
                <Store className="h-7 w-7" />
              </span>
            </div>

            <div className="grid gap-3">
              {result.spaces && result.spaces.length > 0 ? (
                result.spaces.map((space, index) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setPreviewSpace(space)}
                    className="group relative w-full overflow-hidden rounded-[1.75rem] border border-theme-border bg-theme-card p-4 text-left transition hover:-translate-y-0.5 hover:border-theme-accent-border hover:bg-theme-accent-bg"
                  >
                    <div className="absolute right-5 top-5 text-5xl font-black text-theme-primary/[0.025]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="relative flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
                        <Store className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="font-black text-theme-primary group-hover:text-theme-accent-text">{space.name}</h3>
                          <span className="w-fit rounded-full border border-theme-border bg-theme-bg px-2.5 py-1 text-xs font-bold text-theme-primary">
                            {space.access || "public"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-theme-muted">
                          {space.description || "店主还没有写下空间简介。"}
                        </p>

                        {/* Character previews */}
                        {space.characters && space.characters.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {space.characters.slice(0, 4).map((character, charIndex) => {
                                const avatar = characterAvatar(character)
                                return avatar ? (
                                  <img
                                    key={character.id || charIndex}
                                    src={avatar}
                                    alt={character.name || "角色"}
                                    className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <span
                                    key={character.id || charIndex}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-xs font-bold text-theme-primary"
                                  >
                                    {initialFor(character.name)}
                                  </span>
                                )
                              })}
                              {space.characters.length > 4 && (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-bold text-violet-100">
                                  +{space.characters.length - 4}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-theme-muted">
                              {space.characters.slice(0, 2).map((c) => c.name || "未命名").join(" · ")}
                              {space.characters.length > 2 ? " · ..." : ""}
                            </span>
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-theme-muted">
                          <span className="inline-flex items-center gap-1">
                            <MapPinned className="h-3 w-3" />
                            {Number(space.lat).toFixed(4)}, {Number(space.lon).toFixed(4)}
                          </span>
                          <span className="rounded-full border border-theme-border bg-theme-card px-2 py-0.5">
                            {space.status || "unknown"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {space.visit_count || 0} 访客
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="grid min-h-80 place-items-center rounded-[1.75rem] border border-theme-border bg-theme-card text-center">
                  <div className="max-w-sm space-y-3 px-6">
                    <Store className="mx-auto h-10 w-10 text-theme-muted" />
                    <p className="font-bold text-theme-primary">这位创作者还没有空间</p>
                    <p className="text-sm leading-6 text-theme-muted">
                      可能是新创作者，或者空间正在准备中。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      {/* Space Preview Modal */}
      {previewSpace && (
        <SpacePreviewModal
          space={previewSpace}
          onClose={() => setPreviewSpace(null)}
        />
      )}
    </ProductShell>
  )
}


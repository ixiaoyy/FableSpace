import type { ClientLoaderFunctionArgs } from "react-router"
import {
  Activity,
  ArrowLeft,
  DoorOpen,
  MapPin,
  MoreVertical,
  Share2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react"
import { useState } from "react"
import { Link, replace, useLoaderData } from "react-router"
import homeBlackHeroVisual from "../assets/fable-space-05-10/home-black/hero-system-visual.webp"
import { SpaceChatWorkbench } from "../features/space-chat-workbench"
import { resolveHomepageSpaceCover } from "../lib/homepage-spaces"
import { derivePlaceTypeDisplay } from "../lib/place-types.js"
import { fallbackRoleplayState } from "../lib/roleplay-state"
import { buildSpaceFirstMinuteGuide } from "../lib/space-first-minute"
import { redirectPathForRequest, spacePath, WEB_PATHS } from "../lib/web-routes"
import {
  DEFAULT_VISITOR_ID,
  errorMessage,
  getRoleplayState,
  getSpace,
  type RoleplayState,
  type Space,
} from "../lib/spaces"
import { formatSpaceAnchorLocation } from "../product/mapAnchorCopy.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type SpaceLoaderData = {
  spaceId: string
  currentUserId: string
  space: Space | null
  roleplay: RoleplayState | null
  error: string
}

function getCurrentUserIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("user_id")?.trim() ||
    url.searchParams.get("owner_id")?.trim() ||
    url.searchParams.get("visitor_id")?.trim() ||
    DEFAULT_VISITOR_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<SpaceLoaderData> {
  const spaceRef = params.spaceRef ?? ""
  const currentUserId = getCurrentUserIdFromRequest(request)
  if (!spaceRef) {
    return { spaceId: "", currentUserId, space: null, roleplay: null, error: "缺少空间引用" }
  }
  try {
    const space = await getSpace(spaceRef, currentUserId, { view: "entry" })
    const spaceId = space.id
    const url = new URL(request.url)
    const canonicalPath = spacePath(space)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }
    let roleplay: RoleplayState | null = null
    try {
      roleplay = await getRoleplayState(spaceId, currentUserId)
    } catch {
      roleplay = null
    }
    return { spaceId, currentUserId, space, roleplay, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { spaceId: spaceRef, currentUserId, space: null, roleplay: null, error: errorMessage(error) }
  }
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function compactText(value: unknown, fallback: string, maxLength = 84) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
  const display = text || fallback
  return display.length > maxLength ? `${display.slice(0, maxLength)}…` : display
}

function entryStatusDisplay(space: Space) {
  const access = String(space.access || "public").toLowerCase()
  const status = String(space.status || "open").toLowerCase()
  const isClosed = space.is_open === false || status === "closed"

  if (isClosed) {
    return {
      label: "今日熄灯",
      helper: "可预览，稍后再进入",
      className: "border-slate-400/20 bg-slate-400/10 text-slate-100",
    }
  }

  if (access === "password") {
    return {
      label: "口令门扉",
      helper: "带口令进入，不公开扩散",
      className: "border-amber-200/28 bg-amber-300/12 text-amber-50",
    }
  }

  if (access === "private") {
    return {
      label: "主人私域",
      helper: "仅主人或授权访客可见",
      className: "border-violet-200/28 bg-violet-300/12 text-violet-50",
    }
  }

  return {
    label: "公开入口",
    helper: "可直接进入和 NPC 对话",
    className: "border-cyan-200/30 bg-cyan-300/14 text-cyan-50",
  }
}


/**
 * Selects a reusable atmosphere image for the space hero.
 * @param space Current public space payload used as the deterministic seed.
 * @param index Slot index within the homepage section.
 * @returns Public image URL suitable for img src; has no side effects.
 */
function resolveSpaceHomeImage(space: Space, index = 0) {
  return resolveHomepageSpaceCover(space, index) || homeBlackHeroVisual
}

/**
 * Renders the compact top controls above the space homepage stream.
 * @param space Public space payload used for the share title and fallback URL.
 * @returns A responsive top bar; copying the current URL is its only browser side effect.
 */
function SpaceTopBar({ space }: { space: Space }) {
  const [shareStatus, setShareStatus] = useState("")

  /**
   * Copies the current space URL for sharing without calling backend APIs.
   * @returns Promise that resolves after UI status is updated; writes only to clipboard when available.
   */
  async function handleShareClick() {
    const url = typeof window !== "undefined" ? window.location.href : spacePath(space)
    try {
      if (!navigator?.clipboard?.writeText) {
        setShareStatus("复制不可用")
        return
      }
      await navigator.clipboard.writeText(url)
      setShareStatus("已复制")
    } catch {
      setShareStatus("复制失败")
    }
  }

  return (
    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <Link
        to={WEB_PATHS.spaces}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 text-sm font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/30 hover:bg-cyan-300/10"
      >
        <ArrowLeft className="h-4 w-4" />
        返回探索
      </Link>
      <div className="flex items-center gap-2">
        {shareStatus ? <span className="hidden text-xs font-bold text-cyan-100/56 sm:inline">{shareStatus}</span> : null}
        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/18 bg-white/[0.045] px-4 text-sm font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10"
        >
          <Share2 className="h-4 w-4" />
          分享空间
        </button>
        <button
          type="button"
          aria-label="更多空间操作"
          className="grid h-11 w-11 place-items-center rounded-full border border-cyan-200/18 bg-white/[0.045] text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}


/**
 * Renders the full-bleed visual hero for every shared space homepage.
 * @param space Public space payload for title, copy, metrics, and cover art.
 * @param isOwner Whether the current viewer owns this space, used only for a visible badge.
 * @returns Homepage hero section; anchors scroll to the chat workbench and do not persist data.
 */
function SpaceHeroPanel({ space, isOwner }: { space: Space; isOwner: boolean }) {
  const coverImage = resolveSpaceHomeImage(space, 0)
  const firstMinute = buildSpaceFirstMinuteGuide(space)
  const placeType = derivePlaceTypeDisplay(space)
  const anchor = formatSpaceAnchorLocation(space)
  const status = entryStatusDisplay(space)
  const characters = Array.isArray(space.characters) ? space.characters : []

  return (
    <section className="relative min-h-[430px] overflow-hidden rounded-[1.4rem] border border-cyan-200/16 bg-[#061126] shadow-[0_30px_90px_rgba(0,0,0,0.34)] xl:min-h-[640px]">
      <div className="absolute inset-0">
        <img src={coverImage} alt="" className="h-full w-full object-cover opacity-[0.88]" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,16,0.92)_0%,rgba(2,7,16,0.70)_38%,rgba(2,7,16,0.24)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,0.08)_0%,rgba(2,7,16,0.34)_62%,rgba(2,7,16,0.88)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-[430px] max-w-[760px] flex-col justify-between px-5 py-6 sm:px-7 lg:px-8 xl:min-h-[640px]">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-200/18 bg-slate-950/42 px-3 text-[0.68rem] font-black text-cyan-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {characters.length || 2} 位活跃角色
          </span>
          <span className={cx("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.68rem] font-black backdrop-blur", status.className)}>
            <DoorOpen className="h-3.5 w-3.5" />
            {status.label}
          </span>
          {isOwner ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-amber-200/22 bg-amber-300/12 px-3 text-[0.68rem] font-black text-amber-50 backdrop-blur">
              店主视角
            </span>
          ) : null}
        </div>

        <h1 className="max-w-3xl text-4xl font-black leading-[0.96] text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
          {space.name || "未命名空间"}
        </h1>
        <p className="mt-4 max-w-2xl text-xl font-black leading-7 text-white sm:text-2xl">
          {compactText(space.description || firstMinute.experienceType, firstMinute.playObjective, 34)}
        </p>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-cyan-50/76 sm:text-base">
          {compactText(space.scene_prompt || space.description, firstMinute.sceneHint, 104)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-5 text-xs font-bold text-cyan-100/62">
          <span className="inline-flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-cyan-200" />{status.helper}</span>
          <span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-cyan-200" />驻场角色 {characters.length}</span>
          <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-200" />{placeType.shortLabel || placeType.label || firstMinute.experienceType}</span>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to={WEB_PATHS.spaces}
            className="inline-flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-[1.05rem] border border-cyan-200/18 bg-slate-950/52 px-7 text-base font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10 sm:w-auto"
          >
            返回发现
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 hidden max-w-[300px] rounded-[1rem] border border-white/10 bg-slate-950/40 p-3 text-xs font-bold leading-5 text-cyan-50/68 backdrop-blur xl:block">
        <MapPin className="mb-2 h-4 w-4 text-cyan-200" />
        {anchor.text !== "坐标待确认" ? anchor.text : `${Number(space.lat).toFixed(4)}, ${Number(space.lon).toFixed(4)}`}
        <span className="mx-1.5 text-cyan-100/28">·</span>
        {placeType.shortLabel || placeType.label || firstMinute.experienceType}
      </div>
    </section>
  )
}



/**
 * Renders the compact mobile-only space header above the homepage stream.
 * @param space Public space payload for title and status copy.
 * @returns Header bar with navigation links only; has no persistence side effects.
 */
function SpaceMobileHeader({ space }: { space: Space }) {
  const status = entryStatusDisplay(space)
  return (
    <header className="mb-4 lg:hidden">
      <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-cyan-200/16 bg-[#061126]/86 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <Link to={WEB_PATHS.spaces} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-50" aria-label="返回发现">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">{space.name || "空间入口"}</p>
          <p className="truncate text-xs font-bold text-cyan-100/54">{status.label} · {space.characters?.length || 0} 位 NPC</p>
        </div>
      </div>
    </header>
  )
}
/**
 * Composes the shared space homepage shell and keeps the existing chat workbench below it.
 * @param space Public space payload returned by entry view.
 * @param roleplay Existing roleplay state used by the chat workbench.
 * @param currentUserId Current viewer id passed through to the workbench.
 * @param isOwner Whether the current viewer owns the space, used for owner-visible UI.
 * @returns Full responsive space homepage; no schema or backend writes.
 */
function SpaceSpacePage({
  space,
  roleplay,
  currentUserId,
  isOwner,
}: {
  space: Space
  roleplay: RoleplayState | null
  currentUserId: string
  isOwner: boolean
}) {

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020710] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_0%,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(135deg,#061226_0%,#030712_48%,#020710_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-38 [background-image:linear-gradient(rgba(103,232,249,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto w-full max-w-[1320px] px-3 py-4 pb-8 sm:px-5 lg:px-6 lg:py-6 xl:px-7">
        <SpaceMobileHeader space={space} />
        <div className="hidden lg:block">
          <SpaceTopBar space={space} />
        </div>
        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(680px,1.18fr)] xl:items-stretch">
            <SpaceHeroPanel space={space} isOwner={isOwner} />
            <section id="空间主线" className="scroll-mt-6 rounded-[1.4rem] border border-cyan-200/16 bg-[#061126]/78 p-3 shadow-[0_30px_86px_rgba(0,0,0,0.30)] sm:p-4 xl:h-[640px] xl:overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-4 px-1">
                <div>
                  <h2 className="text-xl font-black text-white">角色与聊天</h2>
                  <p className="mt-1 text-sm font-bold text-cyan-100/48">驻场 NPC、当前目标、实时对话。</p>
                </div>
                <span className="hidden rounded-full border border-cyan-200/14 bg-cyan-300/8 px-3 py-1 text-xs font-black text-cyan-100/62 sm:inline-flex">
                  可互动
                </span>
              </div>
              <SpaceChatWorkbench
                space={space}
                roleplay={roleplay}
                currentUserId={currentUserId}
                isOwner={isOwner}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
function SpaceErrorPage({ spaceId, error }: { spaceId: string; error: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020710] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#061226_0%,#030712_48%,#020710_100%)]" />
      <div className="relative mx-auto max-w-3xl">
        <Link to={WEB_PATHS.spaces} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
          <ArrowLeft className="h-4 w-4" />
          返回发现
        </Link>
        <Card className="mt-8 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>无法进入空间</CardTitle>
            <CardDescription className="mt-2">
              {error || `未找到空间 ${spaceId}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-violet-50/70">
              请确认空间链接是否正确，或让店主重新分享入口。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function SpaceRoute() {
  const { spaceId, currentUserId, space, roleplay, error } = useLoaderData<typeof clientLoader>()
  const characters = space?.characters || []
  const effectiveRoleplay = space ? roleplay || fallbackRoleplayState(space, characters) : null
  const isOwner = Boolean(space?.owner_id && space.owner_id === currentUserId)

  if (!space) return <SpaceErrorPage spaceId={spaceId} error={error} />

  return (
    <SpaceSpacePage
      space={space}
      roleplay={effectiveRoleplay}
      currentUserId={currentUserId}
      isOwner={isOwner}
    />
  )
}

import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowLeft,
  DoorOpen,
  Share2,
} from "lucide-react"
import { useState } from "react"
import { Link, Navigate, replace, useLoaderData } from "react-router"
import { HistoricalBroadStreetVisual } from "../components/historical-broad-street-visual"
import { SpaceChatWorkbench } from "../features/space-chat-workbench"
import { HISTORY_PILOT_SPACE_ID } from "../lib/history-pilot-space"
import { resolveHomepageSpaceCover } from "../lib/homepage-spaces"
import { resolveCurrentSessionUserId } from "../lib/session"
import { readVisitorPlayIdentity } from "../lib/visitor-play-identity"
import { redirectPathForRequest, spacePath, WEB_PATHS } from "../lib/web-routes"
import {
  DEFAULT_VISITOR_ID,
  errorMessage,
  getSpace,
  type Space,
} from "../lib/spaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type SpaceLoaderData = {
  spaceId: string
  currentUserId: string
  space: Space | null
  error: string
}

function getCurrentUserIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("user_id")?.trim() ||
    url.searchParams.get("visitor_id")?.trim() ||
    DEFAULT_VISITOR_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<SpaceLoaderData> {
  const spaceRef = params.spaceRef ?? ""
  const currentUserId = await resolveCurrentSessionUserId(getCurrentUserIdFromRequest(request))
  if (!spaceRef) {
    return { spaceId: "", currentUserId, space: null, error: "缺少故事引用" }
  }
  try {
    const space = await getSpace(spaceRef, currentUserId, { view: "entry" })
    const spaceId = space.id
    const url = new URL(request.url)
    const canonicalPath = spacePath(space)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }
    return { spaceId, currentUserId, space, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { spaceId: spaceRef, currentUserId, space: null, error: errorMessage(error) }
  }
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function entryStatusDisplay(space: Space) {
  const status = String(space.status || "open").toLowerCase()
  const isClosed = space.is_open === false || status === "closed"

  if (isClosed) {
    return {
      label: "暂不可用",
      interactionLabel: "稍后再来",
      className: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    }
  }

  return {
    label: "故事进行中",
    interactionLabel: "可回应",
    className: "border-cyan-200/30 bg-cyan-300/14 text-cyan-50",
  }
}


/**
 * Selects published story art without substituting retired generic scene assets.
 * @param space Current public space payload used as the deterministic seed.
 * @param index Slot index within the homepage section.
 * @returns Public image URL suitable for img src; has no side effects.
 */
function resolveSpaceHomeImage(space: Space) {
  return resolveHomepageSpaceCover(space)
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
        to={WEB_PATHS.characters}
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
          分享故事
        </button>
      </div>
    </div>
  )
}


/**
 * Renders the full-bleed visual hero for every shared space homepage.
 * @param space Public space payload for title, copy, metrics, and cover art.
 * @param status Shared entry-status display used by both the hero and interaction panel.
 * @returns Homepage hero section; anchors scroll to the chat workbench and do not persist data.
 */
function SpaceHeroPanel({
  space,
  status,
}: {
  space: Space
  status: ReturnType<typeof entryStatusDisplay>
}) {
  const coverImage = resolveSpaceHomeImage(space)
  const isHistoryWaterPilot = space.id === HISTORY_PILOT_SPACE_ID
  const characters = Array.isArray(space.characters) ? space.characters : []

  return (
    <section className="relative min-h-[390px] overflow-hidden rounded-[1.2rem] border border-cyan-200/16 bg-[#1b2144] shadow-[0_22px_70px_rgba(4,7,22,0.42)] sm:min-h-[430px] xl:min-h-[840px]">
      <div className="absolute inset-0">
        {isHistoryWaterPilot ? (
          <HistoricalBroadStreetVisual className="h-full w-full opacity-[0.92]" />
        ) : coverImage ? (
          <img src={coverImage} alt="" className="h-full w-full object-cover opacity-[0.88]" loading="eager" decoding="async" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,16,0.92)_0%,rgba(2,7,16,0.70)_38%,rgba(2,7,16,0.24)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,0.08)_0%,rgba(2,7,16,0.34)_62%,rgba(2,7,16,0.88)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-[390px] max-w-[760px] flex-col justify-between px-5 py-6 sm:min-h-[430px] sm:px-7 lg:px-8 xl:min-h-[840px]">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-200/18 bg-slate-950/42 px-3 text-[0.68rem] font-black text-cyan-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {characters.length} 位角色
          </span>
          <span className={cx("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.68rem] font-black backdrop-blur", status.className)}>
            <DoorOpen className="h-3.5 w-3.5" />
            {status.label}
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-black leading-[0.98] text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
          {space.name || "未命名故事"}
        </h1>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to={WEB_PATHS.characters}
            className="inline-flex min-h-[3.25rem] w-full touch-manipulation items-center justify-center gap-2 rounded-[0.95rem] border border-cyan-200/18 bg-slate-950/52 px-7 text-base font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10 sm:w-auto"
          >
            返回发现
          </Link>
        </div>
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
      <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-cyan-200/16 bg-[#151a38]/90 p-3 shadow-[0_18px_42px_rgba(4,7,22,0.38)]">
        <Link to={WEB_PATHS.characters} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-50" aria-label="返回角色">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">{space.name || "故事入口"}</p>
          <p className="truncate text-xs font-bold text-cyan-100/54">{status.label} · {space.characters?.length || 0} 位角色</p>
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
 * @returns Full responsive story page; no schema or backend writes.
 */
function SpaceSpacePage({
  space,
  currentUserId,
}: {
  space: Space
  currentUserId: string
}) {
  const status = entryStatusDisplay(space)

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#0d1226] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(103,113,213,0.28),transparent_34rem),radial-gradient(circle_at_58%_72%,rgba(178,123,188,0.08),transparent_26rem),linear-gradient(135deg,#0d1226_0%,#151a38_48%,#2b2e5a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-38 [background-image:linear-gradient(rgba(174,169,230,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(174,169,230,0.035)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto w-full max-w-[1420px] px-3 py-4 pb-8 sm:px-5 lg:px-6 lg:py-6 xl:px-7">
        <SpaceMobileHeader space={space} />
        <div className="hidden lg:block">
          <SpaceTopBar space={space} />
        </div>
        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.74fr)_minmax(720px,1.26fr)] xl:items-stretch">
            <div className="order-2 xl:order-1">
              <SpaceHeroPanel space={space} status={status} />
            </div>
            <section id="story" className="space-mobile-chat-first order-1 flex w-full min-w-0 max-w-full scroll-mt-6 flex-col rounded-[1.2rem] border border-cyan-200/16 bg-[#1b2144]/82 p-3 shadow-[0_24px_72px_rgba(4,7,22,0.38)] sm:p-4 xl:order-2 xl:h-[840px] xl:overflow-hidden">
              <div className="mb-3 flex items-center justify-between gap-4 px-1">
                <h2 className="text-xl font-black text-white">聊天</h2>
                <span className="hidden rounded-full border border-cyan-200/14 bg-cyan-300/8 px-3 py-1 text-xs font-black text-cyan-100/62 sm:inline-flex">
                  {status.interactionLabel}
                </span>
              </div>
              <div className="min-h-0 min-w-0 flex-1">
                <SpaceChatWorkbench
                  space={space}
                  currentUserId={currentUserId}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
function SpaceErrorPage({ spaceId, error }: { spaceId: string; error: string }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0d1226] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0d1226_0%,#151a38_48%,#2b2e5a_100%)]" />
      <div className="relative mx-auto max-w-3xl">
        <Link to={WEB_PATHS.characters} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
          <ArrowLeft className="h-4 w-4" />
          返回发现
        </Link>
        <Card className="mt-8 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>无法进入故事</CardTitle>
            <CardDescription className="mt-2">
              {error || `未找到故事 ${spaceId}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={WEB_PATHS.characters} className="inline-flex min-h-11 items-center rounded-2xl border border-theme-border bg-theme-card px-4 text-sm font-black text-cyan-50">
              返回角色
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function SpaceRoute() {
  const { spaceId, currentUserId, space, error } = useLoaderData<typeof clientLoader>()
  const hasPlayIdentity = Boolean(readVisitorPlayIdentity())
  if (!space) return <SpaceErrorPage spaceId={spaceId} error={error} />
  if (!hasPlayIdentity) return <Navigate to={WEB_PATHS.home} replace />

  return (
    <SpaceSpacePage
      space={space}
      currentUserId={currentUserId}
    />
  )
}

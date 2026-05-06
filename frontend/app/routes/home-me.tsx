/**
 * Home Route Compatibility Page
 *
 * The independent legacy Home MVP is retired. Home now uses the real-coordinate
 * Place/Tavern mainline with `place_type=home`, default-private access, and
 * owner-managed members/relationships from the canonical tavern surfaces.
 */

import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Compass, Home as HomeIcon, MapPinned, ShieldCheck, UserRound } from "lucide-react"
import { Link, useLoaderData } from "react-router"

import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type ViewerRole = "owner" | "visitor"

type HomeRouteLoaderData = {
  ownerId: string
  viewerId: string
  viewerRole: ViewerRole
}

const HOME_PLACE_CREATE_PATH = "/create?place_type=home"

function cleanIdentity(value: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function buildHomePlaceHref(ownerId: string) {
  if (!ownerId) return HOME_PLACE_CREATE_PATH
  const params = new URLSearchParams({ place_type: "home" })
  params.set("owner_id", ownerId)
  return `/create?${params.toString()}`
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<HomeRouteLoaderData> {
  const url = new URL(request.url)
  const ownerId = cleanIdentity(url.searchParams.get("owner_id"))
  const viewerId = cleanIdentity(url.searchParams.get("user_id"))
  const viewerRole: ViewerRole = ownerId && viewerId && ownerId === viewerId ? "owner" : "visitor"

  return { ownerId, viewerId, viewerRole }
}

export default function HomeMePage() {
  const { ownerId, viewerId, viewerRole } = useLoaderData<typeof clientLoader>()
  const homePlaceHref = buildHomePlaceHref(ownerId)
  const ownerHref = ownerId ? `/owner?owner_id=${encodeURIComponent(ownerId)}` : "/owner"
  const isOwnerView = viewerRole === "owner"

  return (
    <ProductShell eyebrow="Home">
      <section
        data-home-route-mode="retired-mainline"
        className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
      >
        <div className="space-y-6">
          <div className="rounded-[2.4rem] border border-lime-300/18 bg-gradient-to-br from-lime-300/12 via-cyan-300/8 to-slate-950/70 p-6 shadow-2xl shadow-black/25 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-3xl border border-lime-200/30 bg-lime-300/12 text-3xl shadow-[0_0_32px_rgba(190,242,100,0.14)]">
                🏠
              </span>
              <span className="rounded-full border border-lime-200/28 bg-lime-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-lime-50">
                Place/Home mainline
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
              Home 已并入真实坐标 Place/Home 主线
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-violet-100/72">
              旧的个人小窝页面不再作为独立产品入口。新的 Home 是一种带真实坐标、默认私密、由店主确认内容的
              <span className="font-semibold text-lime-50"> place_type=home </span>
              空间：创建、NPC 接待、成员关系、留言与权限都回到同一套 Tavern / Place 主链路，避免半成品的双轨体验。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-14">
                <Link to={homePlaceHref}>
                  <HomeIcon className="h-5 w-5" />
                  创建真实坐标 Home
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="min-h-14">
                <Link to={ownerHref}>
                  <UserRound className="h-5 w-5" />
                  管理已有空间
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: MapPinned,
                title: "真实坐标",
                text: "Home 仍必须绑定 lat/lon；不提供无锚点自由空间。",
              },
              {
                icon: ShieldCheck,
                title: "默认私密",
                text: "place_type=home 创建时会收敛为 private，不进入公开发现筛选。",
              },
              {
                icon: Compass,
                title: "主线入口",
                text: "访客通过具体 Tavern/Home 链接进入，不在此页进行聊天或留言。",
              },
            ].map((item) => (
              <Card key={item.title} className="border-white/10 bg-white/[0.04]">
                <CardHeader>
                  <item.icon className="h-6 w-6 text-lime-100" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-violet-100/64">{item.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <Card className="border-cyan-300/16 bg-cyan-300/[0.055]">
            <CardHeader>
              <CardTitle>{isOwnerView ? "主人入口" : "访客入口"}</CardTitle>
              <CardDescription>
                {isOwnerView
                  ? "检测到 owner_id 与 user_id 一致；这里只提供跳转，不在兼容页授予管理权限。"
                  : "访客不会在兼容页看到旧 Home 数据、成员聊天或第二套留言入口。"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-violet-100/68">
              {isOwnerView ? (
                <>
                  <p>继续创建或管理 Home 时，请使用主线页面；后端仍会在真实 API 上验证 owner 身份。</p>
                  <div className="grid gap-2">
                    <Button asChild variant="secondary" className="min-h-12 justify-start">
                      <Link to={homePlaceHref}>创建 place_type=home 空间</Link>
                    </Button>
                    <Button asChild variant="secondary" className="min-h-12 justify-start">
                      <Link to={ownerHref}>进入店主管理</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    若你是访客，请从主人分享的具体空间链接进入，或在发现页浏览公开酒馆。Home 的成员与关系不会被做成访客社交墙。
                  </p>
                  <Button asChild variant="secondary" className="min-h-12 w-full justify-start">
                    <Link to="/discover">去发现公开酒馆</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle>本页不再承载的能力</CardTitle>
              <CardDescription>避免与 Tavern/Home 主链路出现两套互相不一致的数据面。</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-violet-100/64">
                <li>• 不在兼容页创建独立 Home 存储。</li>
                <li>• 不提供占位成员聊天；可对话角色必须绑定正式 TavernCharacter。</li>
                <li>• 不提供公开留言墙或访客间互动入口。</li>
                <li>• 不用前端参数当作真实授权；所有写操作回到后端 owner 校验。</li>
              </ul>
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-3 text-xs leading-5 text-violet-100/52">
                当前参数：owner_id={ownerId || "未提供"} · user_id={viewerId || "未提供"} · view={viewerRole}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </ProductShell>
  )
}

import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, DoorOpen, ShieldCheck, Store } from "lucide-react"
import { Link, replace, useLoaderData } from "react-router"

import { SpaceOwnerManagement } from "../features/space-owner-management"
import {
  DEFAULT_OWNER_ID,
  errorMessage,
  getRoleplayState,
  getSpace,
  type RoleplayState,
  type Space,
} from "../lib/spaces"
import { requireCreatorTools, resolveCurrentSessionUserId } from "../lib/session"
import { redirectPathForRequest, spaceManagePath, spacePath, WEB_PATHS } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type SpaceManageLoaderData = {
  spaceId: string
  currentUserId: string
  space: Space | null
  roleplay: RoleplayState | null
  isOwner: boolean
  error: string
}

function getOwnerIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("owner_id")?.trim() ||
    url.searchParams.get("user_id")?.trim() ||
    DEFAULT_OWNER_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<SpaceManageLoaderData> {
  await requireCreatorTools()
  const spaceRef = params.spaceRef ?? ""
  const currentUserId = await resolveCurrentSessionUserId(getOwnerIdFromRequest(request))
  if (!spaceRef) {
    return { spaceId: "", currentUserId, space: null, roleplay: null, isOwner: false, error: "缺少空间引用" }
  }

  try {
    const space = await getSpace(spaceRef, currentUserId)
    const spaceId = space.id
    const url = new URL(request.url)
    const canonicalPath = spaceManagePath(space)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }
    const isOwner = Boolean(space.owner_id && space.owner_id === currentUserId)
    let roleplay: RoleplayState | null = null
    if (isOwner) {
      try {
        roleplay = await getRoleplayState(spaceId, currentUserId)
      } catch {
        roleplay = null
      }
    }
    return { spaceId, currentUserId, space, roleplay, isOwner, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { spaceId: spaceRef, currentUserId, space: null, roleplay: null, isOwner: false, error: errorMessage(error) }
  }
}

export default function SpaceManageRoute() {
  const { spaceId, currentUserId, space, roleplay, isOwner, error } = useLoaderData<typeof clientLoader>()
  const previewPath = space ? spacePath(space) : WEB_PATHS.spaces

  return (
    <ProductShell eyebrow="店主管理">
      <section data-space-owner-management="dedicated-route" className="scroll-mt-28 space-y-6">
        {space && isOwner ? (
          <>
            <Card className="overflow-hidden border-theme-accent-border bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,27,75,0.62))]">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1.5 text-xs font-black text-theme-accent-text">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      店主管理
                    </div>
                    <CardTitle className="text-4xl font-black leading-tight">{space.name} 管理台</CardTitle>
                    <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                      这里不加载聊天输入框；只处理 NPC 扮演审批、Home/地点关系与访客给店主的反馈。访客体验保留在独立预览页。
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link to={previewPath}>
                        <DoorOpen className="h-4 w-4" />
                        预览访客视角
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link to={`${WEB_PATHS.owner}?owner_id=${encodeURIComponent(currentUserId)}`}>
                        返回经营看板
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <span className="rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-violet-50/72">
                    店主标识：<span className="font-bold text-theme-primary">{currentUserId || "未提供"}</span>
                  </span>
                  <span className="rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-violet-50/72">
                    访问：<span className="font-bold text-theme-primary">{space.access || "public"}</span>
                  </span>
                  <span className="rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-violet-50/72">
                    NPC：<span className="font-bold text-theme-primary">{space.characters?.length || 0}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <SpaceOwnerManagement space={space} roleplay={roleplay} />
          </>
        ) : (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                <Store className="h-3.5 w-3.5" />
                需要店主身份
              </div>
              <CardTitle>需要店主身份</CardTitle>
              <CardDescription className="mt-2">
                {error || "这个入口只用于本空间店主管理。普通访客请进入访客视角和 NPC 对话。"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={previewPath}>
                  <DoorOpen className="h-4 w-4" />
                  进入访客视角
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to={WEB_PATHS.owner}>返回管理入口</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </ProductShell>
  )
}

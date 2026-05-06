import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, DoorOpen, ShieldCheck, Store } from "lucide-react"
import { Link, useLoaderData } from "react-router"

import { TavernOwnerManagement } from "../features/tavern-owner-management"
import {
  DEFAULT_OWNER_ID,
  errorMessage,
  getRoleplayState,
  getTavern,
  type RoleplayState,
  type Tavern,
} from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernManageLoaderData = {
  tavernId: string
  currentUserId: string
  tavern: Tavern | null
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

function visitorPreviewPath(tavernId: string) {
  return `/tavern/${encodeURIComponent(tavernId)}`
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<TavernManageLoaderData> {
  const tavernId = params.tavernId ?? ""
  const currentUserId = getOwnerIdFromRequest(request)
  if (!tavernId) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, isOwner: false, error: "缺少酒馆 ID" }
  }

  try {
    const tavern = await getTavern(tavernId, currentUserId)
    const isOwner = Boolean(tavern.owner_id && tavern.owner_id === currentUserId)
    let roleplay: RoleplayState | null = null
    if (isOwner) {
      try {
        roleplay = await getRoleplayState(tavernId, currentUserId)
      } catch {
        roleplay = null
      }
    }
    return { tavernId, currentUserId, tavern, roleplay, isOwner, error: "" }
  } catch (error) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, isOwner: false, error: errorMessage(error) }
  }
}

export default function TavernManageRoute() {
  const { tavernId, currentUserId, tavern, roleplay, isOwner, error } = useLoaderData<typeof clientLoader>()
  const previewPath = visitorPreviewPath(tavernId)

  return (
    <ProductShell eyebrow="Owner manage">
      <section data-tavern-owner-management="dedicated-route" className="scroll-mt-28 space-y-6">
        {tavern && isOwner ? (
          <>
            <Card className="overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,27,75,0.62))]">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Owner-only management
                    </div>
                    <CardTitle className="text-4xl font-black leading-tight">{tavern.name} 管理台</CardTitle>
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
                      <Link to={`/owner?owner_id=${encodeURIComponent(currentUserId)}`}>
                        返回经营看板
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/72">
                    Owner ID：<span className="font-bold text-white">{currentUserId || "未提供"}</span>
                  </span>
                  <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/72">
                    访问：<span className="font-bold text-white">{tavern.access || "public"}</span>
                  </span>
                  <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-violet-50/72">
                    NPC：<span className="font-bold text-white">{tavern.characters?.length || 0}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <TavernOwnerManagement tavern={tavern} roleplay={roleplay} />
          </>
        ) : (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                <Store className="h-3.5 w-3.5" />
                Owner required
              </div>
              <CardTitle>需要店主身份</CardTitle>
              <CardDescription className="mt-2">
                {error || "这个入口只用于本酒馆店主管理。普通访客请进入访客视角和 NPC 对话。"}
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
                <Link to="/owner">返回管理入口</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </ProductShell>
  )
}

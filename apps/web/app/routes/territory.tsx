import { useState } from "react"
import type { ClientLoaderFunctionArgs } from "react-router"
import { useLoaderData } from "react-router"
import { CircleDotDashed, MapPinned, ShieldCheck } from "lucide-react"

import TerritoryClaimPanel from "../components/TerritoryClaimPanel"
import TerritoryManagementPanel from "../components/TerritoryManagementPanel"
import { requireCreatorTools, resolveCurrentSessionUserId } from "../lib/session"
import { ProductShell } from "../shell/product-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

const DEFAULT_OWNER_ID = "owner"
const DEFAULT_LAT = 39.9042
const DEFAULT_LON = 116.4074

type TerritoryLoaderData = {
  currentUserId: string
  spaceId: string
  lat: number
  lon: number
}

function finiteNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<TerritoryLoaderData> {
  await requireCreatorTools()
  const url = new URL(request.url)
  return {
    currentUserId: await resolveCurrentSessionUserId(url.searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID),
    spaceId: url.searchParams.get("space_id")?.trim() || "",
    lat: finiteNumber(url.searchParams.get("lat"), DEFAULT_LAT),
    lon: finiteNumber(url.searchParams.get("lon"), DEFAULT_LON),
  }
}

export default function TerritoryRoute() {
  const { currentUserId, spaceId, lat, lon } = useLoaderData<typeof clientLoader>()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <ProductShell eyebrow="领地">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6 text-white shadow-2xl shadow-cyan-950/30 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
                <MapPinned className="h-4 w-4" /> 真实坐标申领
              </span>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                为你的空间申领真实地图领地
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-violet-100/78 sm:text-base">
                领地 = 真实坐标 + 类型 + 半径。系统只做坐标占用、同类碰撞检测和地图可视化，不替店主自动生成空间内容。
              </p>
            </div>
            <div className="grid gap-3 text-sm text-violet-50/82">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <ShieldCheck className="mb-3 h-6 w-6 text-emerald-200" />
                同类型领地不可重叠，不同类型可作为功能分区共存。
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <CircleDotDashed className="mb-3 h-6 w-6 text-cyan-200" />
                当前坐标：{lat.toFixed(4)}, {lon.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <Card className="border-white/10 bg-slate-950 text-white shadow-xl shadow-slate-950/30">
            <CardHeader>
              <CardTitle>申领领地</CardTitle>
              <CardDescription className="text-violet-100/65">
                先检查坐标与半径是否可用，再用当前 owner 身份确认申领。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TerritoryClaimPanel
                userId={currentUserId}
                spaceId={spaceId || null}
                initialLat={lat}
                initialLon={lon}
                onCancel={null}
                onClaimSuccess={() => setRefreshKey((value) => value + 1)}
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950 text-white shadow-xl shadow-slate-950/30">
            <CardHeader>
              <CardTitle>我的领地</CardTitle>
              <CardDescription className="text-violet-100/65">
                查看、调整半径、切换状态或废弃当前 owner 名下的领地。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TerritoryManagementPanel
                key={refreshKey}
                userId={currentUserId}
                onTerritoryChange={() => setRefreshKey((value) => value + 1)}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </ProductShell>
  )
}

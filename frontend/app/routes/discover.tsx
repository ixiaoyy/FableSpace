import { ArrowRight, Compass, MapPinned, RadioTower, Search, Store, Waves } from "lucide-react"
import { Link, useLoaderData } from "react-router"

import tavernNeonImage from "../assets/homepage-reference/modules/tavern-neon.png"
import tavernNightImage from "../assets/homepage-reference/modules/tavern-night.png"
import { errorMessage, listTaverns, type TavernListResponse } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"

const previewCards = [
  { image: tavernNightImage, title: "夜间开放", text: "从真实坐标进入店主创作的赛博酒馆。" },
  { image: tavernNeonImage, title: "NPC 在场", text: "角色、氛围和访问规则都由店主决定。" },
]

type DiscoverLoaderData = {
  result: TavernListResponse
  error: string
}

export async function clientLoader(): Promise<DiscoverLoaderData> {
  try {
    return { result: await listTaverns(), error: "" }
  } catch (error) {
    return { result: { taverns: [], count: 0 }, error: errorMessage(error) }
  }
}

export default function DiscoverRoute() {
  const { result, error } = useLoaderData<typeof clientLoader>()

  return (
    <ProductShell eyebrow="Discover">
      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-cyan-300/18 bg-slate-950/72 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black text-fuchsia-100">
              <Compass className="h-3.5 w-3.5" />
              Real map surface
            </div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">发现附近的赛博酒馆</h1>
            <p className="mt-4 text-sm leading-7 text-violet-100/66">
              每个入口都挂接真实坐标。探索者从地图进入，查看店主写下的场景、NPC 与访问边界，再决定是否推门。
            </p>
            <div className="mt-6 grid gap-3 text-sm text-violet-100/70">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <MapPinned className="h-5 w-5 text-cyan-200" />
                <span>{result.count} 间酒馆已接入发现流</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <Search className="h-5 w-5 text-fuchsia-100" />
                <span>优先展示可进入、可回访、可对话的酒馆</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild>
                <Link to="/create">
                  没有喜欢的？开一间
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {error ? (
              <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                API 暂不可用：{error}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {previewCards.map((card) => (
              <article key={card.title} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
                <img src={card.image} alt="" className="h-36 w-full object-cover" loading="lazy" decoding="async" />
                <div className="p-4">
                  <h2 className="font-black text-white">{card.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-violet-100/58">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="relative min-h-[620px] overflow-hidden rounded-[2.2rem] border border-white/12 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(0,214,201,0.24),transparent_17rem),radial-gradient(circle_at_74%_68%,rgba(217,70,239,0.20),transparent_20rem)]" />
          <div className="absolute inset-5 rounded-[1.8rem] border border-cyan-300/10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-[#050615]/76 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Live tavern radar</p>
                <h2 className="mt-2 text-3xl font-black text-white">真实坐标发现层</h2>
                <p className="mt-1 text-sm text-violet-100/56">列表数据来自 `/api/v1/taverns`。</p>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 text-cyan-100">
                <Waves className="h-7 w-7" />
              </span>
            </div>

            <div className="grid gap-3">
              {result.taverns.length ? (
                result.taverns.map((tavern, index) => (
                  <Link
                    key={tavern.id}
                    to={`/tavern/${encodeURIComponent(tavern.id)}`}
                    className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/78 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/55 hover:bg-cyan-300/10"
                  >
                    <div className="absolute right-5 top-5 text-5xl font-black text-white/[0.025]">{String(index + 1).padStart(2, "0")}</div>
                    <div className="relative flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
                        <Store className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="font-black text-white group-hover:text-cyan-100">{tavern.name}</h3>
                          <span className="w-fit rounded-full border border-fuchsia-300/18 bg-fuchsia-300/10 px-2.5 py-1 text-xs font-bold text-fuchsia-100">
                            {tavern.access || "public"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-violet-100/65">
                          {tavern.description || "店主还没有写下酒馆简介。"}
                        </p>
                        <p className="mt-3 text-xs text-violet-100/45">
                          {Number(tavern.lat).toFixed(4)}, {Number(tavern.lon).toFixed(4)} · {tavern.status || "unknown"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="grid min-h-80 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.04] text-center">
                  <div className="max-w-sm space-y-3 px-6">
                    <RadioTower className="mx-auto h-10 w-10 text-violet-100/60" />
                    <p className="font-bold text-white">暂时没有可展示的酒馆</p>
                    <p className="text-sm leading-6 text-violet-100/60">先创建一个真实坐标锚点，地图发现层就会亮起第一盏灯。</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </ProductShell>
  )
}

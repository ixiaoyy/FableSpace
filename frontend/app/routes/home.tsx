import {
  ArrowRight,
  Brain,
  KeyRound,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { Link, useLoaderData } from "react-router"

import discoverRadarSurfaceImage from "../assets/discover/reference/discover-radar-surface.png"
import memoryModuleImage from "../assets/homepage/reference/modules/memory-module.png"
import npcDialogueImage from "../assets/homepage/reference/modules/npc-dialogue.png"
import { HOMEPAGE_NPC_PREVIEW_PORTRAITS } from "../features/tavern-npc-stage/portraitCatalogConfig"
import { buildHomepageView, type HomepageMetric, type HomepageMetricId } from "../lib/homepage-taverns"
import { errorMessage, listTaverns, type TavernListResponse } from "../lib/taverns"
import { Button } from "../ui/button"

type Metric = {
  icon: LucideIcon
  label: string
  value: string
}

type CitySlicePreview = {
  image: string
  name: string
  location: string
  entryMeta: string
  tags: string[]
  id: string
}

type Feature = {
  icon: LucideIcon
  title: string
  text: string
}

type HomeLoaderData = {
  result: TavernListResponse
  error: string
}

const navItems = [
  { to: "/discover", label: "探索" },
  { to: "/discover", label: "区域" },
  { to: "/discover", label: "角色" },
  { to: "/discover", label: "记忆" },
  { to: "/create", label: "创建空间" },
]

const metricIcons: Record<HomepageMetricId, LucideIcon> = {
  coordinates: MapPinned,
  characters: UsersRound,
  encounters: MessageCircle,
  open: Star,
}

const features: Feature[] = [
  { icon: MapPinned, title: "真实坐标", text: "每个入口都落在现实地图上，而不是漂浮空间。" },
  { icon: Brain, title: "记忆回响", text: "角色和区域会保留回访上下文，让相遇不只是一次性对话。" },
  { icon: ShieldCheck, title: "主人边界", text: "内容、访问和记忆权限由空间主人控制，平台不越权发布。" },
]

const portraits = HOMEPAGE_NPC_PREVIEW_PORTRAITS

function withMetricIcons(metrics: HomepageMetric[]): Metric[] {
  return metrics.map((metric) => ({
    ...metric,
    icon: metricIcons[metric.id],
  }))
}

function HomeNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050615]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/8 text-sm font-black text-cyan-100">
            FM
          </span>
          <div>
            <p className="font-black tracking-wide text-white">FableMap</p>
            <p className="text-xs text-violet-100/45">Cyber life on real coordinates</p>
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-violet-100/72" aria-label="首页导航">
            {navItems.map((item) => (
              <Link key={item.label} to={item.to} className="inline-flex min-h-11 touch-manipulation items-center rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/discover"
            className="flex min-h-11 min-w-0 touch-manipulation items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-violet-100/55 transition hover:border-cyan-300/35 hover:text-cyan-100 md:w-72"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">搜索附近坐标、角色、记忆线索</span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/owner">管理入口</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/discover">开始探索</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ icon: Icon, value, label }: Metric) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
      <Icon className="mb-3 h-5 w-5 text-cyan-200" />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-violet-100/58">{label}</p>
    </div>
  )
}

function DesktopMetricRail({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
      {metrics.map(({ icon: Icon, value, label }) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Icon className="h-5 w-5 text-cyan-200" />
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-300/24 to-transparent" />
          </div>
          <p className="mt-3 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-100/48">{label}</p>
        </div>
      ))}
    </div>
  )
}

function CitySlicePreviewCard({ image, name, location, entryMeta, tags, id }: CitySlicePreview) {
  return (
    <Link
      to={`/tavern/${id}`}
      className="group touch-manipulation overflow-hidden rounded-2xl border border-white/10 bg-[#090a1d]/92 transition hover:-translate-y-0.5 hover:border-cyan-300/50"
    >
      <div className="relative h-64 overflow-hidden lg:h-72">
        <img
          src={image}
          alt={`${name} 区域封面`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a1d] via-[#090a1d]/10 to-transparent" />
        <LockKeyhole className="absolute left-4 top-4 h-4 w-4 text-fuchsia-100/80" />
        <span className="absolute bottom-4 right-4 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur-md">
          {entryMeta}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-xl font-black text-white">{name}</h3>
          <p className="mt-1 text-sm text-violet-100/55">{location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-lg border border-fuchsia-300/18 bg-fuchsia-300/10 px-2.5 py-1 text-xs font-bold text-fuchsia-100">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function FeatureItem({ icon: Icon, title, text }: Feature) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-6">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/8 text-fuchsia-100">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-violet-100/58">{text}</p>
    </div>
  )
}

function EmptyCitySliceState({ error }: { error?: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.035] text-center md:col-span-3">
      <div className="max-w-md space-y-3 px-6">
        <MapPinned className="mx-auto h-10 w-10 text-cyan-100/65" />
        <p className="font-black text-white">暂时没有可展示的真实坐标入口</p>
        <p className="text-sm leading-6 text-violet-100/58">
          {error ? `酒馆列表暂不可用：${error}` : "创建第一个公开酒馆后，这里会自动显示真实入口与对应氛围图。"}
        </p>
        <Button asChild variant="secondary">
          <Link to="/create">创建我的空间</Link>
        </Button>
      </div>
    </div>
  )
}

function HeroPosterPreview() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[1.75rem] border border-cyan-300/24 bg-slate-950 shadow-[0_26px_80px_rgba(0,0,0,0.48),0_0_100px_rgba(6,182,212,0.12)] lg:min-h-[560px]">
      <img
        src={discoverRadarSurfaceImage}
        alt="FableMap 真实坐标雷达视觉"
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_53%_51%,rgba(0,229,255,0.16),transparent_16rem),linear-gradient(90deg,rgba(3,5,18,0.82),rgba(3,5,18,0.24)_48%,rgba(3,5,18,0.62))]" />
      <div className="absolute inset-4 rounded-[1.35rem] border border-cyan-200/18 bg-[linear-gradient(90deg,rgba(125,249,255,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(125,249,255,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-4 top-4 rounded-full border border-cyan-300/36 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md">
        Signal detected
      </div>
      <div className="absolute right-4 top-4 hidden rounded-2xl border border-white/14 bg-slate-950/56 p-3 text-right backdrop-blur-xl sm:block">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100/74">Live radius</p>
        <p className="mt-1 text-lg font-black text-white">2.4 km</p>
      </div>
      <div className="absolute left-8 right-8 top-[5.8rem] hidden items-center gap-3 lg:flex">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
        <span className="rounded-full border border-white/12 bg-slate-950/46 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-violet-100/64 backdrop-blur-md">
          Coordinate grid / Memory field / NPC signal
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-300/28 to-transparent" />
      </div>
      <div className="absolute left-[22%] top-[34%] h-4 w-4 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.95)]" />
      <div className="absolute right-[25%] top-[42%] h-3 w-3 rounded-full border border-fuchsia-100 bg-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.85)]" />
      <div className="absolute bottom-[28%] right-[14%] h-3.5 w-3.5 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.85)]" />
      <div className="absolute bottom-5 left-5 max-w-md rounded-3xl border border-white/14 bg-slate-950/62 p-4 backdrop-blur-xl sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/80">35.6987, 139.7713 · 23:47</p>
        <p className="mt-3 text-sm leading-6 text-violet-100/82">不是普通地图标记。坐标、角色和记忆同时亮起，等待你进入。</p>
      </div>
      <div className="absolute right-5 top-28 hidden w-44 rounded-3xl border border-cyan-300/18 bg-slate-950/50 p-4 backdrop-blur-xl lg:block">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-cyan-100/64">Active layers</p>
        <div className="mt-3 space-y-2 text-xs font-bold text-violet-100/68">
          <p className="flex items-center justify-between"><span>坐标入口</span><span className="text-cyan-100">ON</span></p>
          <p className="flex items-center justify-between"><span>角色信号</span><span className="text-fuchsia-100">356</span></p>
          <p className="flex items-center justify-between"><span>记忆回响</span><span className="text-cyan-100">LIVE</span></p>
        </div>
      </div>
      <div className="absolute bottom-5 right-5 hidden rounded-full border border-fuchsia-300/28 bg-fuchsia-300/12 px-4 py-2 text-xs font-black text-fuchsia-100 backdrop-blur-md md:block">
        EXPLORE / REAL COORDINATE
      </div>
    </div>
  )
}

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    return { result: await listTaverns(), error: "" }
  } catch (error) {
    return { result: { taverns: [], count: 0 }, error: errorMessage(error) }
  }
}

export default function HomeRoute() {
  const { result, error } = useLoaderData<typeof clientLoader>()
  const homepage = buildHomepageView(result, error)
  const metrics = withMetricIcons(homepage.metrics)

  return (
    <main className="min-h-screen overflow-hidden bg-[#030512] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(217,70,239,0.14),transparent_30rem),radial-gradient(circle_at_82%_16%,rgba(0,214,201,0.13),transparent_28rem)]" />
      <HomeNav />

      <section className="relative mx-auto grid max-w-[1440px] gap-8 px-6 py-6 lg:grid-cols-[0.56fr_1.44fr] lg:items-center lg:py-8 xl:gap-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Real coordinates. Hidden worlds.
          </div>
          <div className="space-y-4">
            <h1 className="max-w-lg text-[1.72rem] font-bold leading-[1.24] tracking-[-0.015em] text-white sm:text-[2.25rem] sm:leading-[1.2] lg:text-[2.4rem] lg:leading-[1.18] xl:text-[2.58rem]">
              <span className="block">真实坐标，</span>
              <span className="block">藏着会回应的世界</span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-violet-100/70 sm:text-lg">
              在真实地图上，进入一个个由角色、记忆和主人设定共同点亮的区域。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/discover">
                开始探索
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/create">
                创建我的空间
                <KeyRound className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <DesktopMetricRail metrics={metrics} />
        </div>

        <HeroPosterPreview />
      </section>

      <section className="relative border-y border-white/8 bg-white/[0.018] lg:hidden">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-[1320px] px-6 py-16" aria-labelledby="featured-city-slices">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/75">正在发光的区域</p>
            <h2 id="featured-city-slices" className="mt-2 text-3xl font-black text-white sm:text-4xl">
              从地图进入未被看见的世界
            </h2>
          </div>
          <Button asChild variant="ghost" className="w-fit">
            <Link to="/discover">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {homepage.error ? (
          <p className="mb-4 rounded-2xl border border-amber-300/24 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            酒馆列表暂不可用，首页已切换为安全空态：{homepage.error}
          </p>
        ) : null}
        <div className="grid gap-6 md:grid-cols-3">
          {homepage.featuredCitySlices.length ? homepage.featuredCitySlices.map((citySlice) => (
            <CitySlicePreviewCard key={citySlice.id} {...citySlice} />
          )) : <EmptyCitySliceState error={homepage.error} />}
        </div>
      </section>

      <section className="relative bg-[#070819]/70">
        <div className="mx-auto grid max-w-[1320px] gap-6 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-2xl border border-fuchsia-300/18 bg-[#090a1d]/88">
            <div className="relative h-80 overflow-hidden lg:h-[420px]">
              <img src={npcDialogueImage} alt="AI 角色相遇模块" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a1d] via-[#090a1d]/15 to-transparent" />
              <div className="absolute bottom-5 left-6 flex -space-x-3">
                {portraits.map((portrait, index) => (
                  <img
                    key={portrait}
                    src={portrait}
                    alt={`NPC 头像 ${index + 1}`}
                    className="h-14 w-14 rounded-full border-2 border-[#090a1d] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4 p-6">
              <h2 className="text-2xl font-black text-white">AI 角色相遇</h2>
              <p className="text-sm leading-6 text-violet-100/64">进入区域后，和其中的角色对话、建立关系，让一次访问变成可回访的生活片段。</p>
              <Button asChild>
                <Link to="/discover">开始对话</Link>
              </Button>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-2xl border border-cyan-300/18 bg-[#090a1d]/88 p-6">
            <img
              src={memoryModuleImage}
              alt="记忆模块背景"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              loading="lazy"
              decoding="async"
            />
            <div className="relative flex min-h-[420px] flex-col justify-end space-y-5">
              <h2 className="text-2xl font-black text-white">回访记忆</h2>
              <p className="max-w-md text-sm leading-6 text-violet-100/72">你做过的选择、说过的话和建立过的关系，会成为下一次进入同一坐标时的上下文。</p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/62 p-4 backdrop-blur-md">
                <p className="text-sm leading-6 text-violet-100/72">上次你来过这里。有人还记得你留下的问题。</p>
              </div>
              <Button asChild variant="secondary">
                <Link to="/discover">继续探索</Link>
              </Button>
            </div>
          </article>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-[1320px] gap-5 px-6 py-16 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </section>
    </main>
  )
}

